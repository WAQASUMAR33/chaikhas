<?php



/**

 * Get Products/Dishes API - Multi-Branch Support

 * Returns list of all menu items (dishes) with branch filtering

 * 

 * Branch-Admin: Returns only their branch's menu items (requires branch_id)

 * Super-Admin: Returns all menu items with branch info (no branch_id or branch_id = null)

 * 

 * POST Parameters:

 * - terminal (int, optional) - Terminal number (default: 1)

 * - branch_id (int/string, optional) - Branch ID (if null/empty, returns all dishes for super-admin)

 */



ini_set('display_errors', 0);

ini_set('display_startup_errors', 0);

error_reporting(E_ALL);

ini_set('log_errors', 1);



register_shutdown_function(function() {

    $error = error_get_last();

    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {

        while (ob_get_level() > 0) {

            ob_end_clean();

        }

        if (!headers_sent()) {

            header("Content-Type: application/json; charset=UTF-8");

        }

        echo json_encode(["success" => false, "message" => "Fatal error: " . $error['message']]);

        exit();

    }

});



ob_start();



if (!headers_sent()) {

    header("Access-Control-Allow-Origin: *");

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

    header("Access-Control-Allow-Headers: Content-Type, Authorization");

    header("Content-Type: application/json; charset=UTF-8");

}



if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {

    while (ob_get_level() > 0) {

        ob_end_clean();

    }

    http_response_code(200);

    exit();

}



try {

    include("config.php");

} catch (Exception $e) {

    while (ob_get_level() > 0) {

        ob_end_clean();

    }

    if (!headers_sent()) {

        header("Content-Type: application/json; charset=UTF-8");

    }

    echo json_encode(["success" => false, "message" => "Configuration error: " . $e->getMessage()]);

    exit();

}



if (!isset($connection) || !$connection) {

    while (ob_get_level() > 0) {

        ob_end_clean();

    }

    if (!headers_sent()) {

        header("Content-Type: application/json; charset=UTF-8");

    }

    echo json_encode(["success" => false, "message" => "Database connection failed"]);

    exit();

}



try {

    // Get JSON input

    $raw_input = file_get_contents('php://input');

    $input = json_decode($raw_input, true);

    

    // Handle both POST body and GET parameters

    if (!$input || !is_array($input)) {

        $input = $_POST;

    }

    

    // Handle GET requests

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {

        $input = $_GET;

    }

    

    $terminal = isset($input['terminal']) ? intval($input['terminal']) : 1;

    $branch_id_input = isset($input['branch_id']) ? $input['branch_id'] : null;

    

    // Convert branch_id to integer or null

    // Handle null, empty string, 'null', 'undefined', etc.

    if ($branch_id_input === '' || $branch_id_input === 'null' || $branch_id_input === 'undefined' || $branch_id_input === null) {

        $branch_id = null;

    } else {

        $branch_id = intval($branch_id_input);

        if ($branch_id <= 0) {

            $branch_id = null;

        }

    }

    

    // Build SQL query based on branch_id

    // FIXED: Removed c.kitchen_id from SELECT - categories table doesn't have kitchen_id column

    // Get kitchen_id from kitchens table join instead (k.kitchen_id)

    if ($branch_id !== null) {

        // Branch-Admin: Get dishes for specific branch only

        $sql = "SELECT 

                    d.dish_id,

                    d.name,

                    d.description,

                    d.price,

                    d.qnty,

                    d.barcode,

                    d.is_available,

                    d.is_frequent,

                    d.discount,

                    d.category_id,

                    d.terminal,

                    d.branch_id,

                    c.name AS catname,

                    c.kid AS category_kid,

                    COALESCE(k.kitchen_id, 0) AS kitchen_id,

                    b.branch_name,

                    k.title AS kitchen_name,

                    k.code AS kitchen_code

                FROM dishes d

                LEFT JOIN categories c ON d.category_id = c.category_id AND d.branch_id = c.branch_id AND d.terminal = c.terminal

                LEFT JOIN branches b ON d.branch_id = b.branch_id

                LEFT JOIN kitchens k ON d.kitchen_id = k.kitchen_id AND d.branch_id = k.branch_id AND d.terminal = k.terminal

                WHERE d.branch_id = ? AND d.terminal = ?

                ORDER BY COALESCE(c.name, '') ASC, d.name ASC";

        

        $stmt = mysqli_prepare($connection, $sql);

        if (!$stmt) {

            $error = mysqli_error($connection);

            throw new Exception("Error preparing statement: " . ($error ?: "Unknown error") . " | SQL: " . substr($sql, 0, 200));

        }

        mysqli_stmt_bind_param($stmt, "ii", $branch_id, $terminal);

    } else {

        // Super-Admin: Get ALL dishes from ALL branches

        $sql = "SELECT 

                    d.dish_id,

                    d.name,

                    d.description,

                    d.price,

                    d.qnty,

                    d.barcode,

                    d.is_available,

                    d.is_frequent,

                    d.discount,

                    d.category_id,

                    d.terminal,

                    d.branch_id,

                    c.name AS catname,

                    c.kid AS category_kid,

                    COALESCE(k.kitchen_id, 0) AS kitchen_id,

                    b.branch_name,

                    k.title AS kitchen_name,

                    k.code AS kitchen_code

                FROM dishes d

                LEFT JOIN categories c ON d.category_id = c.category_id AND d.branch_id = c.branch_id AND d.terminal = c.terminal

                LEFT JOIN branches b ON d.branch_id = b.branch_id

                LEFT JOIN kitchens k ON d.kitchen_id = k.kitchen_id AND d.branch_id = k.branch_id AND d.terminal = k.terminal

                WHERE d.terminal = ?

                ORDER BY d.branch_id ASC, COALESCE(c.name, '') ASC, d.name ASC";

        

        $stmt = mysqli_prepare($connection, $sql);

        if (!$stmt) {

            $error = mysqli_error($connection);

            throw new Exception("Error preparing statement: " . ($error ?: "Unknown error") . " | SQL: " . substr($sql, 0, 200));

        }

        mysqli_stmt_bind_param($stmt, "i", $terminal);

    }

    

    if (!mysqli_stmt_execute($stmt)) {

        $error = mysqli_error($connection);

        $stmt_error = mysqli_stmt_error($stmt);

        mysqli_stmt_close($stmt);

        throw new Exception("Error executing query: " . ($stmt_error ?: $error ?: "Unknown SQL error"));

    }

    

    $result = mysqli_stmt_get_result($stmt);

    

    if (!$result) {

        $error = mysqli_error($connection);

        mysqli_stmt_close($stmt);

        throw new Exception("Error getting result: " . ($error ?: "Unknown error"));

    }

    

    $menuItems = [];

    while ($row = mysqli_fetch_assoc($result)) {

        // Normalize branch_name

        $branch_name = $row['branch_name'] ?? null;

        if (!$branch_name && $row['branch_id']) {

            $branch_name = 'Branch ' . $row['branch_id'];

        }

        

        // Normalize category name

        $category_name = $row['catname'] ?? null;

        if (!$category_name) {

            $category_name = 'Uncategorized';

        }

        

        $menuItems[] = [

            'dish_id' => intval($row['dish_id']),

            'id' => intval($row['dish_id']), // Alias for frontend compatibility

            'name' => $row['name'] ?? '',

            'dish_name' => $row['name'] ?? '', // Alias

            'description' => $row['description'] ?? '',

            'price' => floatval($row['price'] ?? 0),

            'qnty' => $row['qnty'] ?? '1',

            'quantity' => $row['qnty'] ?? '1', // Alias

            'barcode' => $row['barcode'] ?? '',

            'is_available' => intval($row['is_available'] ?? 1),

            'is_frequent' => intval($row['is_frequent'] ?? 1),

            'discount' => floatval($row['discount'] ?? 0),

            'category_id' => $row['category_id'] ? intval($row['category_id']) : null,

            'category_name' => $category_name,

            'catname' => $category_name, // Alias

            'category_kid' => $row['category_kid'] ? intval($row['category_kid']) : null,

            'kitchen_id' => isset($row['kitchen_id']) && $row['kitchen_id'] > 0 ? intval($row['kitchen_id']) : null,

            'kitchen_name' => $row['kitchen_name'] ?? null,

            'kitchen_code' => $row['kitchen_code'] ?? null,

            'terminal' => intval($row['terminal']),

            'branch_id' => $row['branch_id'] ? intval($row['branch_id']) : null,

            'branch_name' => $branch_name

        ];

    }

    

    mysqli_stmt_close($stmt);

    

    while (ob_get_level() > 0) {

        ob_end_clean();

    }

    if (!headers_sent()) {

        header("Content-Type: application/json; charset=UTF-8");

    }

    

    // Return success response with menu items array

    echo json_encode([

        'success' => true,

        'data' => $menuItems,

        'count' => count($menuItems)

    ]);

    

} catch (Exception $e) {

    $error_message = $e->getMessage();

    $error_details = [

        'message' => $error_message,

        'file' => $e->getFile(),

        'line' => $e->getLine(),

        'trace' => $e->getTraceAsString()

    ];

    

    error_log("Get Products Error: " . $error_message);

    error_log("Get Products Error Details: " . json_encode($error_details));

    

    while (ob_get_level() > 0) {

        ob_end_clean();

    }

    if (!headers_sent()) {

        header("Content-Type: application/json; charset=UTF-8");

    }

    

    http_response_code(500);

    echo json_encode([

        'success' => false,

        'error' => 'Failed to fetch menu items',

        'message' => $error_message,

        'details' => $error_details

    ]);

    exit();

} catch (Error $e) {

    $error_message = $e->getMessage();

    error_log("Get Products Fatal Error: " . $error_message);

    

    while (ob_get_level() > 0) {

        ob_end_clean();

    }

    if (!headers_sent()) {

        header("Content-Type: application/json; charset=UTF-8");

    }

    

    http_response_code(500);

    echo json_encode([

        'success' => false,

        'error' => 'Fatal error occurred',

        'message' => $error_message

    ]);

    exit();

}



exit();

?>

