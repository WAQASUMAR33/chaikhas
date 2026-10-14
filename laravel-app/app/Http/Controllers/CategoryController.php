<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Category::with(['branch', 'kitchen']);

        if ($user->role !== 'super_admin' && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = $request->input('per_page', 10);
        $categories = $query->latest()->paginate($perPage)->withQueryString();
        $branches = Branch::where('status', 'Active')->get();
        $kitchens = DB::table('kitchens')->where('status', 'Active')->get();

        $stats = [
            'total' => Category::count(),
            'active' => Category::where('status', 'Active')->count(),
            'inactive' => Category::where('status', 'Inactive')->count(),
            'attached_kitchen' => Category::whereNotNull('kitchen_id')->count(),
        ];

        if ($request->wantsJson() || $request->ajax() || $request->has('ajax')) {
            return response()->json([
                'success' => true,
                'categories' => $categories,
                'stats' => $stats
            ]);
        }

        return view('categories.index', compact('categories', 'branches', 'kitchens', 'stats'));
    }

    public function store(Request $request)
    {
        if ($request->branch_id === '' || $request->branch_id === '0') {
            $request->merge(['branch_id' => null]);
        }
        if ($request->kitchen_id === '' || $request->kitchen_id === '0') {
            $request->merge(['kitchen_id' => null]);
        }

        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'kitchen_id' => 'nullable|integer',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:Active,Inactive',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:5120',
        ]);

        if ($request->hasFile('image')) {
            $validated['image'] = \App\Services\ImageService::compressAndStore($request->file('image'), 'categories');
        }

        $category = Category::create($validated);
        \App\Services\MasterDataCache::clearAll();

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Category created successfully.',
                'category' => $category->load(['branch', 'kitchen'])
            ]);
        }

        return redirect()->route('categories.index')->with('success', 'Category created successfully.');
    }

    public function update(Request $request, Category $category)
    {
        if ($request->branch_id === '' || $request->branch_id === '0') {
            $request->merge(['branch_id' => null]);
        }
        if ($request->kitchen_id === '' || $request->kitchen_id === '0') {
            $request->merge(['kitchen_id' => null]);
        }

        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'kitchen_id' => 'nullable|integer',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:Active,Inactive',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:5120',
        ]);

        if ($request->hasFile('image')) {
            \App\Services\ImageService::delete($category->image);
            $validated['image'] = \App\Services\ImageService::compressAndStore($request->file('image'), 'categories');
        } elseif ($request->boolean('remove_image')) {
            \App\Services\ImageService::delete($category->image);
            $validated['image'] = null;
        }

        $category->update($validated);
        \App\Services\MasterDataCache::clearAll();

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Category updated successfully.',
                'category' => $category->fresh()->load(['branch', 'kitchen'])
            ]);
        }

        return redirect()->route('categories.index')->with('success', 'Category updated successfully.');
    }

    public function destroy(Request $request, Category $category)
    {
        \App\Services\ImageService::delete($category->image);
        \App\Models\MenuItem::where('category_id', $category->id)->update(['category_id' => null]);
        $category->delete();
        \App\Services\MasterDataCache::clearAll();

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Category deleted successfully.'
            ]);
        }

        return redirect()->route('categories.index')->with('success', 'Category deleted successfully.');
    }
}
