<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\MenuItem;
use App\Models\Recipe;
use Illuminate\Http\Request;

class RecipeController extends Controller
{
    public function index(Request $request)
    {
        $menuItemId = $request->input('menu_item_id');
        $menuItems = MenuItem::where('status', 'Active')->orderBy('name')->get();
        $inventoryItems = InventoryItem::orderBy('item_name')->get();

        $selectedMenuItem = null;
        $recipes = collect();

        if ($menuItemId) {
            $selectedMenuItem = MenuItem::find($menuItemId);
            $recipes = Recipe::with('inventoryItem')->where('menu_item_id', $menuItemId)->get();
        }

        return view('recipes.index', compact('menuItems', 'inventoryItems', 'selectedMenuItem', 'recipes', 'menuItemId'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'menu_item_id' => 'required|exists:menu_items,id',
            'ingredients' => 'required|array|min:1',
            'ingredients.*.inventory_item_id' => 'required|exists:inventory_items,id',
            'ingredients.*.quantity_required' => 'required|numeric|min:0.0001',
            'ingredients.*.unit' => 'required|string',
        ]);

        // Wipe old recipe ingredients for the dish and recreate
        Recipe::where('menu_item_id', $validated['menu_item_id'])->delete();

        foreach ($validated['ingredients'] as $ing) {
            Recipe::create([
                'menu_item_id' => $validated['menu_item_id'],
                'inventory_item_id' => $ing['inventory_item_id'],
                'quantity_required' => $ing['quantity_required'],
                'unit' => $ing['unit'],
            ]);
        }

        \App\Models\AuditLog::log('Saved Recipe BOM', 'Recipe', null, ['menu_item_id' => $validated['menu_item_id']]);

        return redirect()->route('recipes.index', ['menu_item_id' => $validated['menu_item_id']])
            ->with('success', 'Recipe Bill of Materials (BOM) saved successfully!');
    }

    public function destroy($id)
    {
        $recipe = Recipe::findOrFail($id);
        $menuItemId = $recipe->menu_item_id;
        $recipe->delete();

        return redirect()->route('recipes.index', ['menu_item_id' => $menuItemId])
            ->with('success', 'Ingredient removed from recipe!');
    }
}
