<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create default admin account
        User::create([
            'name' => 'Administrator',
            'email' => 'admin@admin.com',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        // Create default petugas account
        User::create([
            'name' => 'Petugas Lapangan 1',
            'email' => 'petugas@petugas.com',
            'password' => Hash::make('petugas123'),
            'role' => 'petugas',
            'is_active' => true,
        ]);
    }
}
