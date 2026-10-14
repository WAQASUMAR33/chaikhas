<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Hall;
use App\Models\MenuItem;
use App\Models\Table;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class MasterDataCache
{
    /**
     * Cache TTL in seconds (1 hour default, cleared on mutation events)
     */
    const TTL = 3600;

    /**
     * Get active branches list (cached)
     */
    public static function getActiveBranches()
    {
        return Cache::remember('master_active_branches', self::TTL, function () {
            return Branch::where('status', 'Active')->get();
        });
    }

    /**
     * Get all active categories (cached)
     */
    public static function getActiveCategories()
    {
        return Cache::remember('master_active_categories', self::TTL, function () {
            return Category::where('status', 'Active')->get();
        });
    }

    /**
     * Get available active menu items (cached)
     */
    public static function getAvailableMenuItems()
    {
        return Cache::remember('master_available_menu_items', self::TTL, function () {
            return MenuItem::where('is_available', true)->where('status', 'Active')->get();
        });
    }

    /**
     * Get active halls for a branch (cached)
     */
    public static function getHallsForBranch(int $branchId)
    {
        return Cache::remember("master_halls_branch_{$branchId}", self::TTL, function () use ($branchId) {
            return Hall::where('branch_id', $branchId)->where('status', 'Active')->get();
        });
    }

    /**
     * Get tables for a branch (cached)
     */
    public static function getTablesForBranch(int $branchId)
    {
        return Cache::remember("master_tables_branch_{$branchId}", self::TTL, function () use ($branchId) {
            return Table::where('branch_id', $branchId)->get();
        });
    }

    /**
     * Get order takers for a branch (cached)
     */
    public static function getOrderTakersForBranch(int $branchId)
    {
        return Cache::remember("master_ordertakers_branch_{$branchId}", self::TTL, function () use ($branchId) {
            return User::where('status', 'Active')
                ->where(function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId)->orWhereNull('branch_id');
                })
                ->orderBy('name')
                ->get();
        });
    }

    /**
     * Clear all cached master reference data
     */
    public static function clearAll()
    {
        Cache::forget('master_active_branches');
        Cache::forget('master_active_categories');
        Cache::forget('master_available_menu_items');

        // Clear branch-specific keys
        $branches = Branch::pluck('id');
        foreach ($branches as $bId) {
            Cache::forget("master_halls_branch_{$bId}");
            Cache::forget("master_tables_branch_{$bId}");
            Cache::forget("master_ordertakers_branch_{$bId}");
        }
    }
}
