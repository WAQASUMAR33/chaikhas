<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageService
{
    /**
     * Compress, resize, and store an uploaded image.
     *
     * @param UploadedFile $file
     * @param string $folder e.g. 'menu' or 'categories'
     * @param int $maxWidth Max width in pixels
     * @param int $maxHeight Max height in pixels
     * @param int $quality Compression quality 1-100
     * @return string Relative storage path (e.g. 'menu/abc.webp')
     */
    public static function compressAndStore(UploadedFile $file, string $folder = 'menu', int $maxWidth = 800, int $maxHeight = 800, int $quality = 80): string
    {
        $storageDir = storage_path("app/public/{$folder}");
        $publicDir = public_path("storage/{$folder}");

        if (!file_exists($storageDir)) {
            @mkdir($storageDir, 0755, true);
        }
        if (!file_exists($publicDir)) {
            @mkdir($publicDir, 0755, true);
        }

        $filename = Str::random(24) . '.webp';
        $storagePath = "{$storageDir}/{$filename}";
        $publicPath = "{$publicDir}/{$filename}";

        $imageContent = file_get_contents($file->getRealPath());
        $srcImage = @imagecreatefromstring($imageContent);

        if ($srcImage !== false) {
            $origWidth = imagesx($srcImage);
            $origHeight = imagesy($srcImage);

            // Calculate dimensions preserving aspect ratio
            $ratio = min($maxWidth / max(1, $origWidth), $maxHeight / max(1, $origHeight), 1.0);
            $newWidth = (int) max(1, round($origWidth * $ratio));
            $newHeight = (int) max(1, round($origHeight * $ratio));

            $dstImage = imagecreatetruecolor($newWidth, $newHeight);

            // Preserve alpha channel for transparent PNGs
            imagealphablending($dstImage, false);
            imagesavealpha($dstImage, true);
            $transparent = imagecolorallocatealpha($dstImage, 255, 255, 255, 127);
            imagefilledrectangle($dstImage, 0, 0, $newWidth, $newHeight, $transparent);
            imagealphablending($dstImage, true);

            imagecopyresampled($dstImage, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);

            // Compress to webp
            imagewebp($dstImage, $storagePath, $quality);
            @copy($storagePath, $publicPath);

            imagedestroy($srcImage);
            imagedestroy($dstImage);
        } else {
            // Fallback standard storage
            $file->storeAs("public/{$folder}", $filename);
            @copy(storage_path("app/public/{$folder}/{$filename}"), $publicPath);
        }

        return "{$folder}/{$filename}";
    }

    /**
     * Delete an existing stored image.
     */
    public static function delete(?string $path): void
    {
        if (!$path) return;

        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
        $publicFile = public_path("storage/{$path}");
        if (file_exists($publicFile)) {
            @unlink($publicFile);
        }
    }
}
