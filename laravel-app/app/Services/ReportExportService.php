<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportExportService
{
    /**
     * Generate and download/stream a PDF document.
     */
    public static function downloadPdf(string $view, array $data, string $filename, string $orientation = 'portrait')
    {
        $pdf = Pdf::loadView($view, $data);
        $pdf->setPaper('a4', $orientation);
        $pdf->setOption([
            'isRemoteEnabled' => true,
            'isHtml5ParserEnabled' => true,
            'defaultFont' => 'sans-serif'
        ]);

        return $pdf->download($filename);
    }

    /**
     * Stream PDF directly in browser tab for viewing/printing.
     */
    public static function streamPdf(string $view, array $data, string $filename, string $orientation = 'portrait')
    {
        $pdf = Pdf::loadView($view, $data);
        $pdf->setPaper('a4', $orientation);
        $pdf->setOption([
            'isRemoteEnabled' => true,
            'isHtml5ParserEnabled' => true,
            'defaultFont' => 'sans-serif'
        ]);

        return $pdf->stream($filename);
    }

    /**
     * Stream a CSV file download ready for Microsoft Excel.
     */
    public static function downloadCsv(string $filename, array $columns, array $rows): StreamedResponse
    {
        $responseHeaders = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ];

        return response()->stream(function () use ($columns, $rows) {
            $file = fopen('php://output', 'w');
            
            // Output UTF-8 BOM for Excel UTF-8 support
            fputs($file, "\xEF\xBB\xBF");

            // Write Header Row
            fputcsv($file, $columns);

            // Write Data Rows
            foreach ($rows as $row) {
                fputcsv($file, $row);
            }

            fclose($file);
        }, 200, $responseHeaders);
    }
}
