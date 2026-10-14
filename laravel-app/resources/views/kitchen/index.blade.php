@extends('layouts.app')

@section('content')
<div class="space-y-6" x-data="{ autoRefresh: true }">
    <!-- Header Banner -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                {{ __('Kitchen Display (KDS)') }}
                <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            </h1>
            <p class="text-slate-500 text-sm font-medium">{{ __('Active Kitchen Orders') }}</p>
        </div>
        <button @click="location.reload()" class="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-sm">
            ↻ {{ __('Kitchen Display (KDS)') }}
        </button>
    </div>

    <!-- Active Tickets Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @forelse($orders as $order)
        <div class="bg-white rounded-2xl border-2 {{ $order->order_status === 'Ready' ? 'border-emerald-500' : 'border-[#026897]' }} shadow-lg overflow-hidden flex flex-col justify-between">
            
            <!-- Ticket Top Header -->
            <div class="p-4 {{ $order->order_status === 'Ready' ? 'bg-emerald-600' : 'bg-[#026897]' }} text-white flex items-center justify-between">
                <div>
                    <h3 class="font-extrabold text-lg">{{ $order->order_number }}</h3>
                    <span class="text-xs font-semibold opacity-90">{{ $order->order_type }} • {{ $order->table->table_number ?? 'Counter' }}</span>
                </div>
                <span class="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
                    {{ $order->created_at->diffForHumans(null, true) }}
                </span>
            </div>

            <!-- Items List -->
            <div class="p-4 space-y-3 flex-1 overflow-y-auto max-h-72">
                @foreach($order->items as $item)
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                        <h4 class="font-extrabold text-slate-900 text-sm">{{ $item->item_name }}</h4>
                        <span class="text-xs font-bold text-slate-500">{{ __('Qty') }}: {{ $item->quantity }}</span>
                    </div>

                    <!-- Status Toggle Form -->
                    <form method="POST" action="{{ route('kitchen.item.status', $item->id) }}">
                        @csrf
                        @method('PATCH')
                        <select name="kitchen_status" onchange="this.form.submit()"
                                class="px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer
                                {{ $item->kitchen_status === 'Pending' ? 'bg-amber-100 text-amber-900 border-amber-300' : '' }}
                                {{ $item->kitchen_status === 'Cooking' ? 'bg-sky-100 text-sky-900 border-sky-300' : '' }}
                                {{ $item->kitchen_status === 'Ready' ? 'bg-blue-100 text-blue-900 border-blue-300' : '' }}
                                {{ $item->kitchen_status === 'Served' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : '' }}">
                            <option value="Pending" {{ $item->kitchen_status === 'Pending' ? 'selected' : '' }}>{{ __('Pending') }}</option>
                            <option value="Cooking" {{ $item->kitchen_status === 'Cooking' ? 'selected' : '' }}>{{ __('Cooking') }}</option>
                            <option value="Ready" {{ $item->kitchen_status === 'Ready' ? 'selected' : '' }}>{{ __('Ready') }}</option>
                            <option value="Served" {{ $item->kitchen_status === 'Served' ? 'selected' : '' }}>{{ __('Served') }}</option>
                        </select>
                    </form>
                </div>
                @endforeach
            </div>

            <!-- Ticket Footer -->
            <div class="p-3 bg-slate-50 border-t border-slate-100 text-xs font-semibold text-slate-500 flex justify-between items-center">
                <span>Items: {{ $order->items->count() }}</span>
                <span class="font-bold text-slate-900">Order: {{ $order->order_status }}</span>
            </div>
        </div>
        @empty
        <div class="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <svg class="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"></path></svg>
            <h3 class="font-extrabold text-slate-800 text-base">Kitchen Queue Clean!</h3>
            <p class="text-xs text-slate-400 mt-1">There are no pending orders in the kitchen.</p>
        </div>
        @endforelse
    </div>
</div>
@endsection
