# 01. Complete POS System Requirements & Specifications

## 1. Executive Summary & Business Context
**FoodBaskets Corp (FBCPOS)** is a multi-branch retail and grocery enterprise operating **18 active branches** with **approximately 22 Point of Sale (POS) terminals** (some branches maintain 1 terminal, while high-volume hub branches operate 2 terminals).

The system must deliver a resilient, high-speed, touchscreen-optimized Android Tablet POS capable of continuous operation during intermittent or prolonged internet outages, coupled with a central cloud backend for consolidated inventory management, financial reporting, and cross-branch visibility.

---

## 2. Core Functional Requirements

### 2.1 Fast Cashier & Checkout Experience
* **Sub-second Barcode Processing**: Rapid barcode scanning via USB/Bluetooth hardware scanners (< 40ms input latency) immediately adds items or increments quantities in the active cart.
* **Touch-Optimized Catalog**: Grid-based category and product navigation with large tap targets (minimum 48x48dp, recommended 64x64dp) for touchscreen operation on 10"-12" Android tablets.
* **Instant Product Search**: Indexed full-text search across Product Name, SKU, and Barcode (< 10ms local query latency over 10,000+ SKU catalog).
* **Cart Controls**:
  - Quantity steppers (`+`, `-`, direct numeric entry).
  - Individual item price checks and line-item discounts.
  - Multi-cart management: Cart Hold (suspending a transaction when a customer steps aside) and Cart Recall.
* **Multi-Tender Payments**:
  - Cash payment with automated change calculation and quick denomination buttons (P100, P200, P500, P1,000).
  - Credit/Debit Card tracking (authorization reference code recording).
  - Mobile Wallets / QR payments (GCash, Maya reference recording).
  - Split tenders (e.g., partial cash + partial e-wallet).
* **Statutory & Custom Discounts**:
  - Senior Citizen & Persons with Disability (PWD) statutory 20% discount + VAT exemption (with mandatory ID recording).
  - Promotional percentage discounts and fixed-amount discounts.
* **Thermal Receipt Generation**: Automatic ESC/POS printing over LAN/Wi-Fi (Port 9100), Bluetooth SPP, or USB OTG in under 1.5 seconds.
* **Cash Drawer Control**: Automated 24V solenoid pulse kick via printer RJ11 connector upon cash transaction completion.

### 2.2 Shift & Cash Drawer Lifecycle
* **Opening Float Entry**: Cashier must record the initial cash drawer float before processing any transactions.
* **Mid-Shift Cash Movements**: Support for Cash Drops (skimming excess cash into a branch safe) and Cash Pay-Outs (petty cash disbursements) with mandatory reason logging.
* **Blind End-of-Shift Reconciliation**: Cashier enters actual counted currency without seeing the theoretical expected cash beforehand.
* **Variance Detection**: System automatically calculates overage/shortage variance (`Actual - (Opening Float + Cash Sales + Pay-Ins - Pay-Outs)`).
* **Shift Readings**:
  - **X-Reading**: Mid-shift financial snapshot without resetting counters.
  - **Z-Reading**: Official end-of-shift closing report that finalizes the session.

### 2.3 Inventory & Stock Control
* **Immutable Stock Movement Ledger**: Every inventory change MUST create a record in `stock_movements`. Direct, untracked modifications to inventory quantity are strictly forbidden.
* **Stock Movement Types**:
  - `STOCK_IN`: Receiving purchase orders or warehouse deliveries.
  - `SALE`: Automated deduction upon checkout finalization.
  - `RETURN_RESTOCK`: Restoring sellable returned items to available inventory.
  - `RETURN_DAMAGE`: Writing off unsellable returned items.
  - `ADJUSTMENT_DAMAGE`: Writing off broken, spoiled, or expired goods.
  - `ADJUSTMENT_PHYSICAL_COUNT`: Periodic physical inventory audit reconciliation.
  - `TRANSFER_OUT` / `TRANSFER_IN`: Inter-branch inventory transfers.
* **Low-Stock Alerting**: Visual indicators when product inventory dips below the configured `reorder_level`.

### 2.4 Offline-First Resilience
* **Zero Cloud Dependency for Core Sales**: All product lookups, barcode scans, cart additions, tax calculations, receipt printouts, and cash drawer triggers occur strictly against the local SQLite database.
* **Autonomous Branch Terminals**: Loss of internet connectivity produces zero user disruption; the POS operates seamlessly offline for days or weeks if necessary.
* **Resilient Outbox Sync Engine**: When connectivity is available, an asynchronous background worker batches pending sales, stock movements, and shift records to the cloud backend with exponential backoff and idempotency keys to prevent duplicate records.

---

## 3. Non-Functional Requirements

| Category | Requirement Specification |
| :--- | :--- |
| **Platform** | Android 10.0+ (API Level 29+), Landscape Tablet layout (1280x800 minimum, 1920x1200 recommended). |
| **Response Time** | < 50ms for barcode scan-to-cart; < 200ms for cart calculation; < 1.5s for receipt print. |
| **Local Storage** | SQLite operational database capable of storing 15,000+ products and 90 days of local sales history (~150MB). |
| **Data Integrity** | ACID compliance on local SQLite transactions; idempotency guarantees across all cloud sync endpoints. |
| **Security** | Argon2/Bcrypt password hashing, salted SHA-256 for local offline PIN verification, JWT with short-lived access tokens + sliding refresh tokens, TLS 1.3 encryption for all network traffic. |
| **Auditability** | Comprehensive audit trail logging all manager overrides, voided lines, manual drawer kicks, and cash adjustments. |
| **Hardware Compatibility**| Standard ESC/POS thermal printers (Epson, Star, Xprinter, Sunmi), USB/Bluetooth HID barcode scanners, RJ11 24V cash drawers. |
