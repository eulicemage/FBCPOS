export const SQLITE_INIT_SCHEMA = `
-- Settings & Terminal State
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Users (Cached for offline PIN authentication)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    branch_id TEXT,
    username TEXT UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    updated_at TEXT NOT NULL
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    color_hex TEXT DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    updated_at TEXT NOT NULL
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    cost_price REAL NOT NULL DEFAULT 0.0,
    selling_price REAL NOT NULL DEFAULT 0.0,
    is_taxable INTEGER DEFAULT 1,
    tax_rate REAL DEFAULT 0.12,
    unit_of_measure TEXT DEFAULT 'PCS',
    is_active INTEGER DEFAULT 1,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, name);

-- Branch Inventory (Local Stock Cache)
CREATE TABLE IF NOT EXISTS branch_inventory (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    stock_quantity REAL NOT NULL DEFAULT 0.0,
    reorder_level REAL NOT NULL DEFAULT 10.0,
    updated_at TEXT NOT NULL,
    UNIQUE(branch_id, product_id)
);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL,
    terminal_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    shift_number TEXT NOT NULL,
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    opening_cash REAL NOT NULL,
    expected_cash REAL,
    actual_cash REAL,
    cash_difference REAL,
    notes TEXT,
    status TEXT DEFAULT 'OPEN',
    sync_status TEXT DEFAULT 'PENDING'
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL,
    terminal_id TEXT NOT NULL,
    cashier_id TEXT NOT NULL,
    shift_id TEXT NOT NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    subtotal_amount REAL NOT NULL,
    discount_type TEXT DEFAULT 'NONE',
    discount_value REAL DEFAULT 0.0,
    discount_amount REAL DEFAULT 0.0,
    tax_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'COMPLETED',
    customer_name TEXT,
    customer_tin_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    sync_status TEXT DEFAULT 'PENDING'
);

CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

-- Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    barcode TEXT NOT NULL,
    product_name TEXT NOT NULL,
    cost_price REAL NOT NULL,
    unit_price REAL NOT NULL,
    quantity REAL NOT NULL,
    discount_amount REAL DEFAULT 0.0,
    tax_amount REAL DEFAULT 0.0,
    total_amount REAL NOT NULL,
    FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    amount REAL NOT NULL,
    amount_tendered REAL NOT NULL,
    change_amount REAL NOT NULL,
    reference_number TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- Stock Movements (Immutable Ledger)
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    terminal_id TEXT,
    user_id TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    quantity_change REAL NOT NULL,
    previous_quantity REAL NOT NULL,
    new_quantity REAL NOT NULL,
    reference_id TEXT,
    reason TEXT,
    created_at TEXT NOT NULL,
    sync_status TEXT DEFAULT 'PENDING'
);

-- Outbox Sync Queue
CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(status, created_at);

-- Draft Active Cart (Crash Recovery)
CREATE TABLE IF NOT EXISTS cart_draft (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    cart_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
`;
