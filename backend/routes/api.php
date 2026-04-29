<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RoadDamageController;
use App\Http\Controllers\TrackingSessionController;
use App\Http\Controllers\UserManagementController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ==================== PUBLIC ROUTES ====================
Route::post('/login', [AuthController::class, 'login']);

// Health check
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'Road Damage Detection API - Dinas PU Kubu Raya',
        'timestamp' => now()->toIso8601String()
    ]);
});

// ==================== AUTHENTICATED ROUTES ====================
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // ==================== ROAD DAMAGES ====================
    Route::prefix('road-damages')->group(function () {
        // IMPORTANT: Static routes BEFORE dynamic {id} routes
        Route::get('/stats/summary', [RoadDamageController::class, 'statistics']);
        Route::get('/map/markers', [RoadDamageController::class, 'mapData']);
        Route::post('/detect', [RoadDamageController::class, 'detect']);

        Route::get('/', [RoadDamageController::class, 'index']);
        Route::get('/{id}', [RoadDamageController::class, 'show']);
        Route::put('/{id}', [RoadDamageController::class, 'update']);
        Route::delete('/{id}', [RoadDamageController::class, 'destroy']);
    });

    // ==================== TRACKING SESSIONS ====================
    Route::prefix('tracking')->group(function () {
        // Petugas: tracking actions
        Route::post('/start', [TrackingSessionController::class, 'start']);
        Route::post('/{id}/stop', [TrackingSessionController::class, 'stop']);
        Route::post('/{id}/route', [TrackingSessionController::class, 'updateRoute']);
        Route::post('/{id}/damage', [TrackingSessionController::class, 'saveDamage']);
        Route::get('/active', [TrackingSessionController::class, 'activeSession']);
        Route::get('/my-history', [TrackingSessionController::class, 'myHistory']);
        Route::get('/{id}', [TrackingSessionController::class, 'show']);
    });

    // ==================== ADMIN ONLY ROUTES ====================
    Route::middleware('role:admin')->group(function () {
        // User Management
        Route::prefix('users')->group(function () {
            Route::get('/', [UserManagementController::class, 'index']);
            Route::post('/', [UserManagementController::class, 'store']);
            Route::get('/{id}', [UserManagementController::class, 'show']);
            Route::put('/{id}', [UserManagementController::class, 'update']);
            Route::post('/{id}/toggle-active', [UserManagementController::class, 'toggleActive']);
        });

        // All tracking sessions (admin view)
        Route::get('/tracking-all', [TrackingSessionController::class, 'allHistory']);

        // Real-time: get all active tracking sessions for live map monitoring
        Route::get('/tracking-live', [TrackingSessionController::class, 'activeSessions']);
    });
});
