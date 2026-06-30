<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    /**
     * Get all users (admin only)
     */
    public function index(Request $request)
    {
        $query = User::query();

        // Filter by role
        if ($request->has('role') && $request->role !== '') {
            $query->where('role', $request->role);
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Search by name or email
        if ($request->has('search') && $request->search !== '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->withCount(['trackingSessions', 'repairedDamages'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($users);
    }

    /**
     * Create new user (admin only)
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'      => 'required|string|max:255',
            'email'     => 'required|email|unique:users,email',
            'phone'     => 'nullable|string|max:20',
            'password'  => 'required|string|min:8',
            'role'      => 'required|in:admin,petugas,reparasi',
        ]);

        $user = User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'phone'     => $request->phone ?? null,
            'password'  => Hash::make($request->password),
            'role'      => $request->role,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Akun pengguna berhasil dibuat.',
            'user'    => $user,
        ], 201);
    }

    /**
     * Get single user detail (admin only)
     */
    public function show($id)
    {
        $user = User::withCount(['trackingSessions', 'repairedDamages'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'user'    => $user,
        ]);
    }

    /**
     * Update user (admin only)
     * Password is only updated when explicitly provided and non-empty.
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'name'      => 'sometimes|string|max:255',
            'email'     => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'phone'     => 'sometimes|nullable|string|max:20',
            'password'  => 'sometimes|nullable|string|min:8',
            'role'      => 'sometimes|in:admin,petugas,reparasi',
            'is_active' => 'sometimes|boolean',
        ]);

        $data = $request->only(['name', 'email', 'phone', 'role', 'is_active']);

        // Only update password if actually provided and non-empty
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
            // Revoke all tokens so user must re-login with new password
            $user->tokens()->delete();
        }

        $user->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Data pengguna berhasil diperbarui.',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * Toggle user active status (admin only)
     */
    public function toggleActive($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => !$user->is_active]);

        return response()->json([
            'success' => true,
            'message' => $user->is_active ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.',
            'user'    => $user,
        ]);
    }
}
