<?php
/**
 * Hostinger Shared Hosting Symlink Helper
 * Upload this file to public_html/symlink.php and open in browser
 */

$target = __DIR__ . '/../storage/app/public';
$shortcut = __DIR__ . '/storage';

if (!file_exists($target)) {
    // Try flat structure
    $target = __DIR__ . '/storage/app/public';
}

echo "<div style='font-family:sans-serif; padding:20px;'>";
echo "<h2>Hostinger Storage Link Helper</h2>";

if (file_exists($shortcut)) {
    echo "<p style='color:orange;'><strong>Notice:</strong> The <code>storage</code> folder/link already exists in your public directory.</p>";
} else {
    if (symlink($target, $shortcut)) {
        echo "<p style='color:green;'><strong>Success!</strong> Storage link created successfully!</p>";
    } else {
        echo "<p style='color:red;'><strong>Error:</strong> Could not create symlink. Please check permissions.</p>";
    }
}

echo "</div>";
