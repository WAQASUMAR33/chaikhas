@php
    $restaurantLogo = \App\Models\Setting::get('restaurant_logo');
    $restaurantName = \App\Models\Setting::get('restaurant_name', 'RAPIDTECHPRO');
    $restaurantSlogan = \App\Models\Setting::get('restaurant_slogan', 'Taste of Royalty & Tradition');
    $restaurantAddress = \App\Models\Setting::get('restaurant_address', 'Main Boulevard, Gulberg III, Lahore');
    $restaurantPhone1 = \App\Models\Setting::get('restaurant_phone1', '+92-300-1234567');
    $restaurantPhone2 = \App\Models\Setting::get('restaurant_phone2');
    $brandingNotes = \App\Models\Setting::get('branding_notes', 'STRN / NTN # 1234567-8');
    $currentBranchName = Auth::user()->branch->branch_name ?? 'All Branches';

    $queryParams = request()->query();
    $streamPdfUrl = request()->url() . '?' . http_build_query(array_merge($queryParams, ['export' => 'stream_pdf']));
    $downloadPdfUrl = request()->url() . '?' . http_build_query(array_merge($queryParams, ['export' => 'pdf']));
    $csvUrl = request()->url() . '?' . http_build_query(array_merge($queryParams, ['export' => 'csv']));
@endphp

<!-- Printable A4 Header (Matching Uploaded Report Spec) -->
<div class="hidden print:block mb-4 text-black">
    <!-- Center Report Title -->
    <div class="text-center mb-3">
        <h1 class="text-2xl font-bold uppercase tracking-tight text-black" style="font-family: Arial, sans-serif;">
            {{ $reportTitle ?? 'Sales & Performance Report' }}
        </h1>
    </div>

    <!-- Header Grid: Top Left Company Details | Top Right Logo & Dates -->
    <div class="flex items-start justify-between pb-3 text-xs">
        <!-- Top Left: Company / Restaurant Details -->
        <div class="space-y-1 leading-tight max-w-[65%]">
            <div class="text-sm font-bold text-black">{{ $restaurantName }}</div>
            <div class="text-xs text-black">{{ $restaurantAddress }}</div>
            <div class="text-xs text-black">
                Phone: {{ $restaurantPhone1 }} @if($restaurantPhone2) / {{ $restaurantPhone2 }} @endif
            </div>
            @if($brandingNotes)
                <div class="text-[10px] text-gray-700">{{ $brandingNotes }}</div>
            @endif
        </div>

        <!-- Top Right: Logo Box & Filter Date Range -->
        <div class="flex flex-col items-end gap-1.5 text-right">
            <!-- Logo Box -->
            @if($restaurantLogo)
                <img src="{{ asset('storage/' . $restaurantLogo) }}" alt="Logo" class="max-h-14 max-w-[130px] object-contain border border-black p-1">
            @else
                <div class="w-28 h-12 border border-black flex items-center justify-center text-xs font-bold text-gray-800">
                    {{ strtoupper(substr($restaurantName, 0, 12)) }}
                </div>
            @endif

            <!-- Date Range Box -->
            <div class="text-xs font-semibold text-black space-y-0.5 mt-0.5">
                @if(isset($startDate) && isset($endDate))
                    <div><span class="font-bold">Date:</span> From: {{ \Carbon\Carbon::parse($startDate)->format('m/d/Y') }} To: {{ \Carbon\Carbon::parse($endDate)->format('m/d/Y') }}</div>
                @else
                    <div><span class="font-bold">Date:</span> {{ now()->format('m/d/Y') }}</div>
                @endif
                <div><span class="font-bold">Branch:</span> {{ $currentBranchName }}</div>
            </div>
        </div>
    </div>
</div>

<!-- Report Actions Toolbar (Official PDF & CSV Server-Side Export Service) -->
<div class="no-print mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-slate-200/80 rounded-xl shadow-xs">
    <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Official Reporting & Export Services</span>
    </div>

    <div class="flex flex-wrap items-center gap-2">
        <a href="{{ $streamPdfUrl }}" target="_blank" class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer">
            <span>📄</span> View / Print PDF Report
        </a>

        <a href="{{ $downloadPdfUrl }}" class="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer">
            <span>⬇️</span> Save PDF Document
        </a>

        <a href="{{ $csvUrl }}" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer">
            <span>📊</span> Export Excel (.csv)
        </a>
    </div>
</div>

<style>
    @media print {
        @page {
            size: A4 portrait;
            margin: 10mm 12mm;
        }
        
        aside, header, nav, form, button, a:not(.print-keep), .no-print, .no-print * {
            display: none !important;
        }
        
        .print\:block {
            display: block !important;
        }
        
        body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 10pt !important;
            line-height: 1.2 !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* Strict Formal Table Grid Matching Spec */
        table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 10px !important;
            border: 1px solid #000000 !important;
        }
        th, td {
            padding: 5px 6px !important;
            border: 1px solid #000000 !important;
            font-size: 9pt !important;
            color: #000000 !important;
        }
        th {
            background-color: #f8fafc !important;
            font-weight: bold !important;
            text-align: center !important;
            text-transform: uppercase !important;
        }
    }
</style>

<script>
    if (typeof window.exportReportToExcel === 'undefined') {
        window.exportReportToExcel = function() {
            let tables = document.querySelectorAll('table');
            if (!tables || tables.length === 0) {
                alert('No data tables found on this report page to export.');
                return;
            }
            
            let csv = [];
            
            tables.forEach((table, index) => {
                if (index > 0) csv.push([]);
                let rows = table.querySelectorAll('tr');
                
                for (let i = 0; i < rows.length; i++) {
                    let row = [], cols = rows[i].querySelectorAll('td, th');
                    
                    for (let j = 0; j < cols.length; j++) {
                        let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, ' ').replace(/\s+/g, ' ').trim();
                        data = data.replace(/"/g, '""');
                        row.push('"' + data + '"');
                    }
                    
                    csv.push(row.join(','));
                }
            });

            let csvString = csv.join('\n');
            let blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            let link = document.createElement('a');
            let url = URL.createObjectURL(blob);
            let pageTitle = document.title || 'Report';
            let cleanTitle = pageTitle.replace(/[^a-zA-Z0-9]/g, '_');
            
            link.setAttribute('href', url);
            link.setAttribute('download', cleanTitle + '_' + new Date().toISOString().slice(0, 10) + '.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    }
</script>
