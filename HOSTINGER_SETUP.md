# Hostinger Live Hosting Configuration

## Database Configuration

Your database credentials:
- **Database Name**: `u889453186_chaikhas`
- **Database User**: `u889453186_chaikhas`
- **Database Password**: `Resturantkhas@786`
- **Database Host**: `localhost` (on Hostinger)
- **Website**: `darkgreen-trout-102253.hostingersite.com`

## Environment Variables Setup

Create a `.env.local` file in the root of your project with the following content:

```env
# API Base URL for Live Hosting (Hostinger)
NEXT_PUBLIC_API_BASE_URL=https://darkgreen-trout-102253.hostingersite.com/api

# Database Configuration (for reference - actual config is in PHP files)
DB_HOST=localhost
DB_NAME=u889453186_chaikhas
DB_USER=u889453186_chaikhas
DB_PASS=Resturantkhas@786
```

## PHP Backend Configuration

**IMPORTANT**: You need to update your PHP backend configuration file (usually `config.php` or `database.php` in your API folder) with the database password:

```php
<?php
// Database configuration for Hostinger
define('DB_HOST', 'localhost');
define('DB_NAME', 'u889453186_chaikhas');
define('DB_USER', 'u889453186_chaikhas');
define('DB_PASS', 'Resturantkhas@786');
?>
```

## Steps to Configure:

1. **Create `.env.local` file** in the project root with the content above
2. **Update PHP config file** on your Hostinger server with the database password
3. **Upload your API files** to: `https://darkgreen-trout-102253.hostingersite.com/api/`
4. **Test the connection** by accessing your API endpoints

## API Endpoints

Make sure your API endpoints are accessible at:
- Base URL: `https://darkgreen-trout-102253.hostingersite.com/api/`
- Example: `https://darkgreen-trout-102253.hostingersite.com/api/login.php`

## Printer Management

The printer pages have been updated with:
- ✅ Better response handling
- ✅ Branch support for super admin
- ✅ Test printer functionality
- ✅ Improved error messages
- ✅ Console logging for debugging

## Notes

- The `.env.local` file should NOT be committed to git (it's in .gitignore)
- Update the API base URL if your domain changes
- Make sure CORS is enabled on your Hostinger server for API requests

