<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'password'  => 'hashed',
    ];

    /** Check if user is admin */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /** Check if user is petugas (field surveyor) */
    public function isPetugas(): bool
    {
        return $this->role === 'petugas';
    }

    /** Check if user is tim perbaikan (repair team) */
    public function isReparasi(): bool
    {
        return $this->role === 'reparasi';
    }

    /** Tracking sessions created by this user (petugas) */
    public function trackingSessions()
    {
        return $this->hasMany(TrackingSession::class);
    }

    /** Road damages repaired by this user (reparasi) */
    public function repairedDamages()
    {
        return $this->hasMany(RoadDamage::class, 'repaired_by');
    }
}
