<?php

namespace App\Http\Controllers;

use App\Models\TrackingSession;
use App\Models\RoadDamage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TrackingSessionController extends Controller
{
    /**
     * Start a new tracking session
     */
    public function start(Request $request)
    {
        $user = $request->user();

        // Check if user already has an active session
        $activeSession = TrackingSession::where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if ($activeSession) {
            return response()->json([
                'success' => false,
                'message' => 'Anda sudah memiliki sesi tracking yang aktif.',
                'session' => $activeSession,
            ], 400);
        }

        $session = TrackingSession::create([
            'user_id' => $user->id,
            'started_at' => now(),
            'route_path' => [],
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sesi tracking dimulai.',
            'session' => $session,
        ]);
    }

    /**
     * End tracking session
     */
    public function stop(Request $request, $id)
    {
        $user = $request->user();
        $session = TrackingSession::where('id', $id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->firstOrFail();

        $session->update([
            'ended_at' => now(),
            'status' => 'completed',
        ]);

        $session->load('roadDamages');

        return response()->json([
            'success' => true,
            'message' => 'Sesi tracking selesai.',
            'session' => $session,
            'total_damages' => $session->roadDamages->count(),
        ]);
    }

    /**
     * Update route path (add GPS coordinates during tracking)
     */
    public function updateRoute(Request $request, $id)
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $user = $request->user();
        $session = TrackingSession::where('id', $id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->firstOrFail();

        $routePath = $session->route_path ?? [];
        $routePath[] = [
            'lat' => $request->latitude,
            'lng' => $request->longitude,
            'timestamp' => now()->toIso8601String(),
        ];

        $session->update(['route_path' => $routePath]);

        return response()->json([
            'success' => true,
            'message' => 'Rute diperbarui.',
        ]);
    }

    /**
     * Save damage detection during tracking session
     */
    public function saveDamage(Request $request, $id)
    {
        $request->validate([
            'image' => 'required|string', // base64 image
            'damage_type' => 'required|string|in:Retak-Buaya,Retak-Memanjang,Retak-Melintang,Lubang',
            'confidence' => 'required|numeric|between:0,1',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $user = $request->user();
        $session = TrackingSession::where('id', $id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->firstOrFail();

        // Save base64 image to file
        $imageData = $request->image;
        if (str_contains($imageData, ',')) {
            $imageData = explode(',', $imageData)[1];
        }
        $imageName = Str::uuid() . '.jpg';
        $imagePath = 'uploads/' . $imageName;
        Storage::disk('public')->put($imagePath, base64_decode($imageData));

        $damage = RoadDamage::create([
            'tracking_session_id' => $session->id,
            'image_path' => $imagePath,
            'damage_type' => $request->damage_type,
            'confidence' => $request->confidence,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'severity' => 'medium',
            'status' => 'pending',
        ]);

        // Calculate severity
        $damage->severity = $damage->calculateSeverity();
        $damage->save();

        return response()->json([
            'success' => true,
            'message' => 'Data kerusakan tersimpan.',
            'damage' => $damage,
        ]);
    }

    /**
     * Get tracking sessions for current user (petugas)
     */
    public function myHistory(Request $request)
    {
        $user = $request->user();
        $sessions = TrackingSession::where('user_id', $user->id)
            ->withCount('roadDamages')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($sessions);
    }

    /**
     * Get all tracking sessions (admin only)
     */
    public function allHistory(Request $request)
    {
        $query = TrackingSession::with('user:id,name,email')
            ->withCount('roadDamages')
            ->orderBy('created_at', 'desc');

        // Filter by user
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $sessions = $query->paginate(10);

        return response()->json($sessions);
    }

    /**
     * Get single tracking session detail
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();

        $query = TrackingSession::with(['user:id,name,email', 'roadDamages']);

        // Petugas can only see own sessions
        if ($user->isPetugas()) {
            $query->where('user_id', $user->id);
        }

        $session = $query->findOrFail($id);

        return response()->json([
            'success' => true,
            'session' => $session,
        ]);
    }

    /**
     * Get active session for current user
     */
    public function activeSession(Request $request)
    {
        $user = $request->user();
        $session = TrackingSession::where('user_id', $user->id)
            ->where('status', 'active')
            ->with('roadDamages')
            ->first();

        return response()->json([
            'success' => true,
            'session' => $session,
        ]);
    }

    /**
     * Get ALL active tracking sessions (admin real-time monitoring)
     * Returns active sessions with route_path and road_damages for live map
     */
    public function activeSessions(Request $request)
    {
        $sessions = TrackingSession::where('status', 'active')
            ->with(['user:id,name,email', 'roadDamages:id,tracking_session_id,damage_type,confidence,latitude,longitude,created_at'])
            ->get();

        return response()->json([
            'success' => true,
            'sessions' => $sessions->map(function ($session) {
                $routePath = $session->route_path ?? [];
                $lastPosition = count($routePath) > 0 ? end($routePath) : null;

                return [
                    'id' => $session->id,
                    'user' => $session->user,
                    'started_at' => $session->started_at,
                    'route_path' => $routePath,
                    'last_position' => $lastPosition,
                    'damages' => $session->roadDamages,
                    'total_damages' => $session->roadDamages->count(),
                ];
            }),
        ]);
    }
}
