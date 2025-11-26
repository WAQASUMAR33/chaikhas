# PowerShell Script to Help Fix get_products.php SQL Error
# This script will show you the problematic line in get_products.php

$filePath = "C:\wamp64\www\restuarent\api\get_products.php"

if (Test-Path $filePath) {
    Write-Host "✅ File found: $filePath" -ForegroundColor Green
    Write-Host ""
    
    # Read the file
    $content = Get-Content $filePath -Raw
    
    # Search for kitchen_id references
    Write-Host "Searching for 'kitchen_id' references..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check if kitchen_id exists
    if ($content -match "kitchen_id") {
        Write-Host "⚠️  Found 'kitchen_id' references in the file!" -ForegroundColor Red
        Write-Host ""
        
        # Show lines containing kitchen_id
        $lines = Get-Content $filePath
        $lineNumber = 0
        $foundLines = @()
        
        foreach ($line in $lines) {
            $lineNumber++
            if ($line -match "kitchen_id") {
                $foundLines += "$lineNumber : $line"
            }
        }
        
        Write-Host "Lines containing 'kitchen_id':" -ForegroundColor Yellow
        Write-Host ""
        foreach ($lineInfo in $foundLines) {
            Write-Host $lineInfo -ForegroundColor Cyan
        }
        Write-Host ""
        
        # Check specifically for c.kitchen_id
        if ($content -match "c\.kitchen_id") {
            Write-Host "❌ FOUND THE PROBLEM: 'c.kitchen_id' is in the SELECT statement!" -ForegroundColor Red
            Write-Host ""
            Write-Host "TO FIX:" -ForegroundColor Yellow
            Write-Host "1. Open the file in a text editor (Notepad++, VS Code, etc.)" -ForegroundColor White
            Write-Host "2. Search for 'c.kitchen_id' (Ctrl + F)" -ForegroundColor White
            Write-Host "3. Remove 'c.kitchen_id' from the SELECT clause" -ForegroundColor White
            Write-Host "4. Save the file" -ForegroundColor White
            Write-Host "5. Refresh your browser" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Host "⚠️  Found 'kitchen_id' but not 'c.kitchen_id' - check the lines above" -ForegroundColor Yellow
        }
        
        Write-Host "See FIX_GET_PRODUCTS_SQL_ERROR.md for detailed instructions" -ForegroundColor Green
    } else {
        Write-Host "✅ No 'kitchen_id' found in the file" -ForegroundColor Green
        Write-Host "The error might be coming from a different source" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ File not found at: $filePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check if:" -ForegroundColor Yellow
    Write-Host "1. WAMP is installed in C:\wamp64\" -ForegroundColor White
    Write-Host "2. The API folder is at C:\wamp64\www\restuarent\api\" -ForegroundColor White
    Write-Host "3. The file name is exactly 'get_products.php'" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

