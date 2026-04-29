<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TrackingSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'started_at',
        'ended_at',
        'route_path',
        'status',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'route_path' => 'array',
    ];

    /**
     * Get the user that owns this tracking session
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get road damages found during this tracking session
     */
    public function roadDamages()
    {
        return $this->hasMany(RoadDamage::class);
    }

    /**
     * Check if session is currently active
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Calculate duration in minutes
     */
    public function getDurationMinutes(): ?float
    {
        if (!$this->ended_at) return null;
        return $this->started_at->diffInMinutes($this->ended_at);
    }
}
