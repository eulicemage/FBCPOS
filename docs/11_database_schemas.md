# 11. Dual Database Schemas & Data Models

## 1. Cloud PostgreSQL Schema

```sql
-- PostgreSQL 16 Central Cloud Database Schema

-- Branches
CREATE TABLE branches (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    tax_id VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Terminals
CREATE TABLE terminals (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    terminal_number VARCHAR(10) NOT NULL,
    device_uid VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    api_secret_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, terminal_number)
);

-- Users
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) REFERENCES branches(id) ON DELETE SET NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Categories
CREATE TABLE categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    color_hex VARCHAR(10) DEFAULT '#3B82F6',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_taxable BOOLEAN DEFAULT TRUE,
    tax_rate NUMERIC(5,4) DEFAULT 0.1200,
    unit_of_measure VARCHAR(20) DEFAULT 'PCS',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_updated_at ON products(updated_at);

-- Branch Inventory (Per-Branch Stock Balances)
CREATE TABLE branch_inventory (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock_quantity NUMERIC(12,3) NOT NULL DEFAULT 0.000,
    reorder_level NUMERIC(12,3) NOT NULL DEFAULT 10.000,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, product_id)
);

-- Shifts
CREATE TABLE shifts (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    terminal_id VARCHAR(36) NOT NULL REFERENCES terminals(id),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    shift_number VARCHAR(50) NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    opening_cash NUMERIC(12,2) NOT NULL,
    expected_cash NUMERIC(12,2),
    actual_cash NUMERIC(12,2),
    cash_difference NUMERIC(12,2),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sales
CREATE TABLE sales (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    terminal_id VARCHAR(36) NOT NULL REFERENCES terminals(id),
    cashier_id VARCHAR(36) NOT NULL REFERENCES users(id),
    shift_id VARCHAR(36) NOT NULL REFERENCES shifts(id),
    invoice_number VARCHAR(60) UNIQUE NOT NULL,
    subtotal_amount NUMERIC(12,2) NOT NULL,
    discount_type VARCHAR(30) DEFAULT 'NONE',
    discount_value NUMERIC(12,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    payment_status VARCHAR(30) DEFAULT 'PAID',
    status VARCHAR(30) DEFAULT 'COMPLETED',
    customer_name VARCHAR(100),
    customer_tin_id VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sales_branch_date ON sales(branch_id, created_at);
CREATE INDEX idx_sales_invoice ON sales(invoice_number);

-- Sale Items
CREATE TABLE sale_items (
    id VARCHAR(36) PRIMARY KEY,
    sale_id VARCHAR(36) NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id),
    sku VARCHAR(50) NOT NULL,
    barcode VARCHAR(50) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    cost_price NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    quantity NUMERIC(12,3) NOT NULL,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL
);

-- Payments
CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
    sale_id VARCHAR(36) NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    amount_tendered NUMERIC(12,2) NOT NULL,
    change_amount NUMERIC(12,2) NOT NULL,
    reference_number VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL
);

-- Stock Movements (Immutable Ledger)
CREATE TABLE stock_movements (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id),
    product_id VARCHAR(36) NOT NULL REFERENCES products(id),
    terminal_id VARCHAR(36) REFERENCES terminals(id),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    movement_type VARCHAR(30) NOT NULL,
    quantity_change NUMERIC(12,3) NOT NULL,
    previous_quantity NUMERIC(12,3) NOT NULL,
    new_quantity NUMERIC(12,3) NOT NULL,
    reference_id VARCHAR(100),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_stock_movements_branch_product ON stock_movements(branch_id, product_id, created_at);
```
