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
        $query = RoadDamage::query()
            ->with(['trackingSession.user:id,name', 'repairedBy:id,name']);

        if ($request->has('type') && $request->type) {
            $query->ofType($request->type);
        }
        if ($request->has('status') && $request->status) {
            $query->withStatus($request->status);
        }
        if ($request->has('severity') && $request->severity) {
            $query->where('severity', $request->severity);
        }
        if ($request->has('lat') && $request->has('lng')) {
            $query->nearLocation($request->lat, $request->lng, $request->get('radius', 5));
        }
        if ($request->has('from_date') && $request->from_date) {
            $query->where('created_at', '>=', $request->from_date);
        }
        if ($request->has('to_date') && $request->to_date) {
            $query->where('created_at', '<=', $request->to_date);
        }

        $sortBy    = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->get('per_page', 20);
        return response()->json($query->paginate($perPage));
    }

    /**
     * Get single road damage by ID
     */
    public function show($id)
    {
        $damage = RoadDamage::with([
            'trackingSession.user:id,name',
            'repairedBy:id,name',
        ])->findOrFail($id);

        return response()->json($damage);
    }

    /**
     * Detect road damage from uploaded image (manual upload via admin)
     */
    public function detect(Request $request)
    {
        $request->validate([
            'image'               => 'required|image|mimes:jpeg,png,jpg|max:10240',
            'latitude'            => 'nullable|numeric|between:-90,90',
            'longitude'           => 'nullable|numeric|between:-180,180',
            'location_address'    => 'nullable|string|max:500',
            'tracking_session_id' => 'nullable|integer|exists:tracking_sessions,id',
        ]);

        try {
            $image     = $request->file('image');
            $imageName = Str::uuid() . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('uploads', $imageName, 'public');

            $yoloApiUrl = env('YOLO_API_URL', 'http://localhost:5000');
            $response   = Http::attach(
                'image',
                file_get_contents($image->getRealPath()),
                $image->getClientOriginalName()
            )->post($yoloApiUrl . '/detect', [
                'conf'         => $request->get('confidence', 0.15),
                'return_image' => 'true',
            ]);

            if (!$response->successful()) {
                return response()->json(['success' => false, 'error' => 'YOLO API error: ' . $response->body()], 500);
            }

            $detectionResult = $response->json();
            $savedDamages    = [];

            if ($detectionResult['total_detections'] > 0) {
                foreach ($detectionResult['detections'] as $detection) {
                    $damage = RoadDamage::create([
                        'tracking_session_id' => $request->tracking_session_id,
                        'image_path'          => $imagePath,
                        'damage_type'         => $detection['class_name'],
                        'confidence'          => $detection['confidence'],
                        'latitude'            => $request->latitude,
                        'longitude'           => $request->longitude,
                        'location_address'    => $request->location_address,
                        'area_cm2'            => $detection['area_cm2'] ?? null,
                        'area_m2'             => $detection['area_m2'] ?? null,
                        'area_px'             => $detection['area_px'] ?? null,
                        'bbox'                => $detection['bbox'] ?? null,
                        'severity'            => 'medium',
                        'status'              => 'pending',
                    ]);
                    $damage->severity = $damage->calculateSeverity();
                    $damage->save();
                    $savedDamages[] = $damage;
                }
            }

            return response()->json([
                'success'            => true,
                'total_detections'   => $detectionResult['total_detections'],
                'detections'         => $savedDamages,
                'annotated_image'    => $detectionResult['image_base64'] ?? null,
                'original_image_url' => Storage::url($imagePath),
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update road damage (admin: status, severity, notes)
     */
    public function update(Request $request, $id)
    {
        $damage = RoadDamage::findOrFail($id);

        $request->validate([
            'notes'            => 'nullable|string',
            'severity'         => 'nullable|in:low,medium,high',
            'status'           => 'nullable|in:pending,verified,waiting_validation,repaired',
            'location_address' => 'nullable|string|max:500',
        ]);

        $damage->update($request->only(['notes', 'severity', 'status', 'location_address']));

        return response()->json(['success' => true, 'damage' => $damage]);
    }

    /**
     * Tim Perbaikan reports a repair: upload photo + mark as repaired
     */
    public function laporPerbaikan(Request $request, $id)
    {
        $user = $request->user();

        // Only tim perbaikan (reparasi role) can use this
        if ($user->role !== 'reparasi') {
            return response()->json(['success' => false, 'message' => 'Akses ditolak.'], 403);
        }

        $damage = RoadDamage::findOrFail($id);

        // Must be verified first
        if ($damage->status !== 'verified') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya kerusakan yang sudah diverifikasi yang dapat dilaporkan perbaikannya.',
            ], 422);
        }

        $request->validate([
            'repair_photo' => 'required|image|mimes:jpeg,png,jpg|max:10240',
            'repair_notes' => 'nullable|string|max:1000',
        ]);

        // Save repair photo
        $photo     = $request->file('repair_photo');
        $photoName = 'repair_' . Str::uuid() . '.' . $photo->getClientOriginalExtension();
        $photoPath = $photo->storeAs('uploads/repair_photos', $photoName, 'public');

        if (!$photoPath) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan foto perbaikan ke server.',
            ], 500);
        }

        $damage->update([
            'status'            => 'waiting_validation',
            'repair_photo_path' => $photoPath,
            'repair_notes'      => $request->repair_notes,
            'repaired_by'       => $user->id,
            'repaired_at'       => now(),
            'notes'             => null,
        ]);

        return response()->json([
            'success'          => true,
            'message'          => 'Laporan perbaikan berhasil dikirim. Menunggu validasi admin.',
            'damage'           => $damage->fresh()->load('repairedBy:id,name'),
            'repair_photo_url' => Storage::url($photoPath),
        ]);
    }

    /**
     * Admin: Approve a repair (waiting_validation -> repaired)
     */
    public function approveRepair(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Akses ditolak.'], 403);
        }

        $damage = RoadDamage::findOrFail($id);

        if ($damage->status !== 'waiting_validation') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya kerusakan dengan status menunggu validasi yang dapat disetujui.',
            ], 422);
        }

        $damage->update(['status' => 'repaired']);

        return response()->json([
            'success' => true,
            'message' => 'Perbaikan berhasil disetujui dan ditandai selesai.',
            'damage'  => $damage->fresh()->load('repairedBy:id,name'),
        ]);
    }

    /**
     * Admin: Reject a repair (waiting_validation -> verified, clear repair photo)
     */
    public function rejectRepair(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Akses ditolak.'], 403);
        }

        $damage = RoadDamage::findOrFail($id);

        if ($damage->status !== 'waiting_validation') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya kerusakan dengan status menunggu validasi yang dapat ditolak.',
            ], 422);
        }

        // Delete the repair photo from storage
        if ($damage->repair_photo_path && Storage::disk('public')->exists($damage->repair_photo_path)) {
            Storage::disk('public')->delete($damage->repair_photo_path);
        }

        $damage->update([
            'status'            => 'verified',
            'repair_photo_path' => null,
            'repair_notes'      => null,
            'repaired_by'       => null,
            'repaired_at'       => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Laporan perbaikan ditolak. Status dikembalikan ke terverifikasi.',
            'damage'  => $damage->fresh(),
        ]);
    }

    /**
     * Delete road damage record
     */
    public function destroy($id)
    {
        $damage = RoadDamage::findOrFail($id);

        if ($damage->image_path && Storage::disk('public')->exists($damage->image_path)) {
            Storage::disk('public')->delete($damage->image_path);
        }
        if ($damage->repair_photo_path && Storage::disk('public')->exists($damage->repair_photo_path)) {
            Storage::disk('public')->delete($damage->repair_photo_path);
        }

        $damage->delete();

        return response()->json(['success' => true, 'message' => 'Data kerusakan jalan berhasil dihapus.']);
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
            if ($damage->repair_photo_path && Storage::disk('public')->exists($damage->repair_photo_path)) {
                Storage::disk('public')->delete($damage->repair_photo_path);
            }
            $damage->delete();
        }

        return response()->json([
            'success'       => true,
            'message'       => count($request->ids) . ' data kerusakan berhasil dihapus.',
            'deleted_count' => count($request->ids),
        ]);
    }

    /**
     * Get statistics
     */
    public function statistics(Request $request)
    {
        $dateFilter = function ($query) use ($request) {
            if ($request->has('from_date') && $request->from_date) {
                $query->where('created_at', '>=', $request->from_date);
            }
            if ($request->has('to_date') && $request->to_date) {
                $query->where('created_at', '<=', $request->to_date);
            }
        };

        return response()->json([
            'total'       => RoadDamage::where($dateFilter)->count(),
            'by_type'     => RoadDamage::where($dateFilter)->selectRaw('damage_type, COUNT(*) as count')->groupBy('damage_type')->get(),
            'by_severity' => RoadDamage::where($dateFilter)->selectRaw('severity, COUNT(*) as count')->groupBy('severity')->get(),
            'by_status'   => RoadDamage::where($dateFilter)->selectRaw('status, COUNT(*) as count')->groupBy('status')->get(),
        ]);
    }

    /**
     * Get map markers data
     * - Admin/Petugas: semua marker + filter per request
     * - Reparasi: hanya marker berstatus 'verified'
     * - Petugas: semua milik sendiri + yang verified/repaired dari petugas lain
     */
    public function mapData(Request $request)
    {
        $user  = $request->user();
        $query = RoadDamage::query()
            ->with(['trackingSession.user:id,name', 'repairedBy:id,name'])
            ->whereNotNull('latitude')
            ->whereNotNull('longitude');

        // Tim perbaikan: hanya lihat yang sudah diverifikasi (belum repaired)
        if ($user->role === 'reparasi') {
            $query->where('status', 'verified');
        } else {
            // Admin & petugas: filter dari request
            if ($request->has('type') && $request->type)         $query->ofType($request->type);
            if ($request->has('status') && $request->status)     $query->withStatus($request->status);
            if ($request->has('severity') && $request->severity) $query->where('severity', $request->severity);
        }

        $damages = $query->get([
            'id', 'damage_type', 'latitude', 'longitude',
            'severity', 'status', 'confidence', 'area_cm2',
            'created_at', 'image_path', 'tracking_session_id',
            'repair_photo_path', 'repair_notes', 'repaired_by', 'repaired_at', 'notes',
        ]);

        return response()->json([
            'success' => true,
            'markers' => $damages->map(function ($damage) use ($user) {
                $sessionUserId = $damage->trackingSession?->user?->id ?? null;
                return [
                    'id'               => $damage->id,
                    'type'             => $damage->damage_type,
                    'lat'              => $damage->latitude,
                    'lng'              => $damage->longitude,
                    'severity'         => $damage->severity,
                    'status'           => $damage->status,
                    'confidence'       => $damage->confidence,
                    'area_cm2'         => $damage->area_cm2,
                    'created_at'       => $damage->created_at->format('Y-m-d H:i:s'),
                    'image_url'        => Storage::url($damage->image_path),
                    'petugas_name'     => $damage->trackingSession?->user?->name ?? null,
                    'petugas_user_id'  => $sessionUserId,
                    'is_own'           => $sessionUserId !== null && $sessionUserId === $user->id,
                    'ruas_jalan'       => $damage->trackingSession?->ruas_jalan_name ?? null,
                    'repair_photo_url' => $damage->repair_photo_path ? Storage::url($damage->repair_photo_path) : null,
                    'repair_notes'     => $damage->repair_notes,
                    'repaired_by_name' => $damage->repairedBy?->name ?? null,
                    'repaired_at'      => $damage->repaired_at?->format('Y-m-d H:i:s') ?? null,
                    'notes'            => $damage->notes,
                ];
            }),
        ]);
    }
}
