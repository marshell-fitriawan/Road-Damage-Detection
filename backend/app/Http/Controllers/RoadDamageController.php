<?php

namespace App\Http\Controllers;

use App\Models\RoadDamage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class RoadDamageController extends Controller
{
    /**
     * Get all road damages with optional filters
     */
    public function index(Request $request)
    {
        $query = RoadDamage::query()->with('trackingSession.user:id,name');

        // Filter by damage type
        if ($request->has('type') && $request->type) {
            $query->ofType($request->type);
        }

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->withStatus($request->status);
        }

        // Filter by severity
        if ($request->has('severity') && $request->severity) {
            $query->where('severity', $request->severity);
        }

        // Filter by location radius
        if ($request->has('lat') && $request->has('lng')) {
            $radius = $request->get('radius', 5);
            $query->nearLocation($request->lat, $request->lng, $radius);
        }

        // Filter by date range
        if ($request->has('from_date') && $request->from_date) {
            $query->where('created_at', '>=', $request->from_date);
        }
        if ($request->has('to_date') && $request->to_date) {
            $query->where('created_at', '<=', $request->to_date);
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Paginate
        $perPage = $request->get('per_page', 20);
        $damages = $query->paginate($perPage);

        return response()->json($damages);
    }

    /**
     * Get single road damage by ID
     */
    public function show($id)
    {
        $damage = RoadDamage::with('trackingSession.user:id,name')->findOrFail($id);
        return response()->json($damage);
    }

    /**
     * Detect road damage from uploaded image (for manual upload)
     */
    public function detect(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg|max:10240',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'location_address' => 'nullable|string|max:500',
            'tracking_session_id' => 'nullable|integer|exists:tracking_sessions,id',
        ]);

        try {
            // Save uploaded image
            $image = $request->file('image');
            $imageName = Str::uuid() . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('uploads', $imageName, 'public');

            // Send to YOLO API for detection
            $yoloApiUrl = env('YOLO_API_URL', 'http://localhost:5000');
            $response = Http::attach(
                'image',
                file_get_contents($image->getRealPath()),
                $image->getClientOriginalName()
            )->post($yoloApiUrl . '/detect', [
                'conf' => $request->get('confidence', 0.15),
                'return_image' => 'true'
            ]);

            if (!$response->successful()) {
                return response()->json([
                    'success' => false,
                    'error' => 'YOLO API error: ' . $response->body()
                ], 500);
            }

            $detectionResult = $response->json();

            // Save each detection to database
            $savedDamages = [];
            if ($detectionResult['total_detections'] > 0) {
                foreach ($detectionResult['detections'] as $detection) {
                    $damage = RoadDamage::create([
                        'tracking_session_id' => $request->tracking_session_id,
                        'image_path' => $imagePath,
                        'damage_type' => $detection['class_name'],
                        'confidence' => $detection['confidence'],
                        'latitude' => $request->latitude,
                        'longitude' => $request->longitude,
                        'location_address' => $request->location_address,
                        'area_cm2' => $detection['area_cm2'] ?? null,
                        'area_m2' => $detection['area_m2'] ?? null,
                        'area_px' => $detection['area_px'] ?? null,
                        'bbox' => $detection['bbox'] ?? null,
                        'severity' => 'medium',
                        'status' => 'pending'
                    ]);

                    $damage->severity = $damage->calculateSeverity();
                    $damage->save();
                    $savedDamages[] = $damage;
                }
            }

            return response()->json([
                'success' => true,
                'total_detections' => $detectionResult['total_detections'],
                'detections' => $savedDamages,
                'annotated_image' => $detectionResult['image_base64'] ?? null,
                'original_image_url' => Storage::url($imagePath)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update road damage record
     */
    public function update(Request $request, $id)
    {
        $damage = RoadDamage::findOrFail($id);

        $request->validate([
            'notes' => 'nullable|string',
            'severity' => 'nullable|in:low,medium,high',
            'status' => 'nullable|in:pending,verified,repaired',
            'location_address' => 'nullable|string|max:500',
        ]);

        $damage->update($request->only([
            'notes',
            'severity',
            'status',
            'location_address'
        ]));

        return response()->json([
            'success' => true,
            'damage' => $damage
        ]);
    }

    /**
     * Delete road damage record
     */
    public function destroy($id)
    {
        $damage = RoadDamage::findOrFail($id);

        if (Storage::disk('public')->exists($damage->image_path)) {
            Storage::disk('public')->delete($damage->image_path);
        }

        $damage->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data kerusakan jalan berhasil dihapus.'
        ]);
    }

    /**
     * Bulk delete multiple road damage records
     */
    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:road_damages,id',
        ]);

        $damages = RoadDamage::whereIn('id', $request->ids)->get();

        foreach ($damages as $damage) {
            if ($damage->image_path && Storage::disk('public')->exists($damage->image_path)) {
                Storage::disk('public')->delete($damage->image_path);
            }
            $damage->delete();
        }

        return response()->json([
            'success' => true,
            'message' => count($request->ids) . ' data kerusakan berhasil dihapus.',
            'deleted_count' => count($request->ids),
        ]);
    }

    /**
     * Get statistics (fixed query bug)
     */
    public function statistics(Request $request)
    {
        // Apply date filter
        $dateFilter = function ($query) use ($request) {
            if ($request->has('from_date') && $request->from_date) {
                $query->where('created_at', '>=', $request->from_date);
            }
            if ($request->has('to_date') && $request->to_date) {
                $query->where('created_at', '<=', $request->to_date);
            }
        };

        $total = RoadDamage::where($dateFilter)->count();

        $byType = RoadDamage::where($dateFilter)
            ->selectRaw('damage_type, COUNT(*) as count')
            ->groupBy('damage_type')
            ->get();

        $bySeverity = RoadDamage::where($dateFilter)
            ->selectRaw('severity, COUNT(*) as count')
            ->groupBy('severity')
            ->get();

        $byStatus = RoadDamage::where($dateFilter)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        return response()->json([
            'total' => $total,
            'by_type' => $byType,
            'by_severity' => $bySeverity,
            'by_status' => $byStatus,
        ]);
    }

    /**
     * Get map markers data
     */
    public function mapData(Request $request)
    {
        $query = RoadDamage::query()
            ->with('trackingSession.user:id,name')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude');

        if ($request->has('type') && $request->type) {
            $query->ofType($request->type);
        }
        if ($request->has('status') && $request->status) {
            $query->withStatus($request->status);
        }
        if ($request->has('severity') && $request->severity) {
            $query->where('severity', $request->severity);
        }

        $damages = $query->get([
            'id', 'damage_type', 'latitude', 'longitude',
            'severity', 'status', 'confidence', 'area_cm2',
            'created_at', 'image_path', 'tracking_session_id',
        ]);

        return response()->json([
            'success' => true,
            'markers' => $damages->map(function ($damage) {
                return [
                    'id'           => $damage->id,
                    'type'         => $damage->damage_type,
                    'lat'          => $damage->latitude,
                    'lng'          => $damage->longitude,
                    'severity'     => $damage->severity,
                    'status'       => $damage->status,
                    'confidence'   => $damage->confidence,
                    'area_cm2'     => $damage->area_cm2,
                    'created_at'   => $damage->created_at->format('Y-m-d H:i:s'),
                    'image_url'    => Storage::url($damage->image_path),
                    'petugas_name' => $damage->trackingSession?->user?->name ?? null,
                    'ruas_jalan'   => $damage->trackingSession?->ruas_jalan_name ?? null,
                ];
            }),
        ]);
    }
}
