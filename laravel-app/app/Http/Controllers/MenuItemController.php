<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Category;
use App\Models\MenuItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MenuItemController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = MenuItem::with(['branch', 'category', 'recipes.inventoryItem']);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $menuItems = $query->latest()->paginate(10)->withQueryString();
        $branches = \App\Services\MasterDataCache::getActiveBranches();
        $categories = \App\Services\MasterDataCache::getActiveCategories();
        $inventoryItems = \App\Models\InventoryItem::orderBy('item_name')->get();

        return view('menu.index', compact('menuItems', 'branches', 'categories', 'inventoryItems'));
    }

    public function store(Request $request)
    {
        if ($request->branch_id === '' || $request->branch_id === '0') {
            $request->merge(['branch_id' => null]);
        }
        if ($request->category_id === '' || $request->category_id === '0') {
            $request->merge(['category_id' => null]);
        }

        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'category_id' => 'nullable|exists:categories,id',
            'name' => 'required|string|max:255',
            'barcode' => 'nullable|string|max:50',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'discount' => 'nullable|integer|min:0|max:100',
            'is_available' => 'boolean',
            'is_frequent' => 'boolean',
            'status' => 'required|in:Active,Inactive',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:5120',
        ]);

        $validated['is_available'] = $request->has('is_available');
        $validated['is_frequent'] = $request->has('is_frequent');

        if ($request->hasFile('image')) {
            $validated['image'] = \App\Services\ImageService::compressAndStore($request->file('image'), 'menu');
        }

        $menuItem = MenuItem::create($validated);

        // Sync Raw Products / Recipe BOM
        $this->syncDishIngredients($menuItem, $request->input('ingredients', []));

        \App\Services\MasterDataCache::clearAll();

        return redirect()->route('menu.index')->with('success', 'Menu item and recipe ingredients saved successfully.');
    }

    /**
     * Route parameter is {menu} from Route::resource('menu', ...)
     * so the variable MUST be named $menu for implicit binding.
     */
    public function update(Request $request, MenuItem $menu)
    {
        if ($request->branch_id === '' || $request->branch_id === '0') {
            $request->merge(['branch_id' => null]);
        }
        if ($request->category_id === '' || $request->category_id === '0') {
            $request->merge(['category_id' => null]);
        }

        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'category_id' => 'nullable|exists:categories,id',
            'name' => 'required|string|max:255',
            'barcode' => 'nullable|string|max:50',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'discount' => 'nullable|integer|min:0|max:100',
            'is_available' => 'boolean',
            'is_frequent' => 'boolean',
            'status' => 'required|in:Active,Inactive',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:5120',
        ]);

        $validated['is_available'] = $request->has('is_available');
        $validated['is_frequent'] = $request->has('is_frequent');

        if ($request->hasFile('image')) {
            \App\Services\ImageService::delete($menu->image);
            $validated['image'] = \App\Services\ImageService::compressAndStore($request->file('image'), 'menu');
        } elseif ($request->boolean('remove_image')) {
            \App\Services\ImageService::delete($menu->image);
            $validated['image'] = null;
        }

        $menu->update($validated);

        // Sync Raw Products / Recipe BOM
        $this->syncDishIngredients($menu, $request->input('ingredients', []));

        \App\Services\MasterDataCache::clearAll();

        return redirect()->route('menu.index')->with('success', 'Menu item and recipe ingredients updated successfully.');
    }

    /**
     * Route parameter is {menu} from Route::resource('menu', ...)
     */
    public function destroy(MenuItem $menu)
    {
        \App\Services\ImageService::delete($menu->image);
        \App\Models\OrderItem::where('menu_item_id', $menu->id)->update(['menu_item_id' => null]);
        \App\Models\Recipe::where('menu_item_id', $menu->id)->delete();
        $menu->delete();
        \App\Services\MasterDataCache::clearAll();
        return redirect()->route('menu.index')->with('success', 'Menu item deleted successfully.');
    }

    /**
     * Synchronize Raw Ingredients (Recipe BOM) for a Menu Item
     */
    private function syncDishIngredients(MenuItem $menuItem, $ingredients): void
    {
        // Wipe existing recipe lines for this dish
        \App\Models\Recipe::where('menu_item_id', $menuItem->id)->delete();

        if (!is_array($ingredients)) {
            return;
        }

        foreach ($ingredients as $ing) {
            $productId = $ing['product_id'] ?? null;
            $quantity = floatval($ing['quantity'] ?? 0);
            $unit = $ing['unit'] ?? 'Units';

            if ($productId && $quantity > 0) {
                \App\Models\Recipe::create([
                    'menu_item_id' => $menuItem->id,
                    'inventory_item_id' => $productId,
                    'quantity_required' => $quantity,
                    'unit' => $unit,
                ]);
            }
        }
    }
}
