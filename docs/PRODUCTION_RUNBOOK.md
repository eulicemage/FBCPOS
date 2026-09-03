# FoodBaskets POS — Production Deployment & Operations Runbook

**Version**: 1.0.0-ReleaseCandidate  
**Target Environment**: Android Tablets (7" to 12"), Linux/Docker Cloud Backend, PostgreSQL 15+, Xprinter 70x50mm Thermal Printers

---

## 1. System Architecture & Zero-Cloud Offline Resilience

FoodBaskets POS operates on an **Offline-First Outbox Pattern Architecture**:
1. **Local SQLite Primary**: 100% of product catalog, inventory balances, shift records, customer accounts, and sales write to local SQLite with full ACID guarantees.
2. **Zero Cashier Blocking**: Sales, returns, and inventory deductions commit in milliseconds. The terminal operates unhindered even if the internet is down for hours or days.
3. **Background Outbox Sync**:
   - Upstream: The background sync worker flushes pending transactions to `POST /api/v1/sync/push` in batches of 25.
   - Downstream: High-watermark delta sync pulls updated catalog items and prices from `GET /api/v1/catalog`.
   - Idempotency: All records use UUIDs to guarantee zero duplicate charges or sales.

---

## 2. Hardware Setup & Xprinter Calibration

### 2.1 Thermal Paper Specification
- **Paper Roll**: **70x50mm** Thermal Roll (Width: 70mm, Diameter: 50mm).
- **Print Geometry**: 203 DPI (8 dots/mm) $\rightarrow$ 560 dots width.
- **Column Calibration**: **40 columns** maximum (Font A 12x24 dots). Zero margin clipping.

### 2.2 Printer Connectivity
- **Interface**: Network TCP / Ethernet / Wi-Fi (Port **9100**).
- **Default IP**: `192.168.2.100` (Configure static IP on printer via Xprinter Test Tool).
- **In-App Configuration**: Tap **`⚙ Xprinter`** in header $\rightarrow$ enter IP & Port $\rightarrow$ tap **"Test 70mm Print"**.

### 2.3 Cash Drawer RJ11 Pinout
- Connect the RJ11 cable from the cash drawer to the `DK` port on the back of the Xprinter.
- **Drawer Pin Configuration**: `PIN_2` (standard ESC/POS pulse: `ESC p 0 25 250`).
- Auto-kick triggers on:
  - Cash payment tender
  - Return slip / Credit Note issuance
  - Manual drawer kick button (**`🔓 Open Drawer`**)

---

## 3. Cashier Daily Operating Procedures

### 3.1 Morning Store Opening
1. Power on tablet and Xprinter.
2. Launch **FoodBaskets POS**.
3. Cashier logs in with 4/6-digit PIN.
4. If prompted for opening cash float, enter drawer amount (e.g. ₱2,000.00).

### 3.2 Master Bypass Mode (Manager Access)
- Located at the top left of the POS header: **`🔒 BYPASS (F10)`**.
- Tap to unlock **`🔓 BYPASS ACTIVE`**:
  - Allows cashiers to add/edit products on the fly (**`➕ Add Item`**).
  - Skips supervisor PIN prompts on voids and manual discounts.
  - Allows adjusting member allowance points.
- **Security**: Every activation and deactivation is logged in the **`🛡 Audit`** ledger.

### 3.3 Mid-Day Shift Handover: X-Reading (Switch Cashier)
1. Tap **`⇄ X-Read (Switch)`** in the header.
2. Enter declared cash count.
3. System compares declared cash vs expected cash (opening float + cash sales) and calculates Cash Over / Short.
4. Tap **Confirm Shift Handover & Print Slip**:
   - Prints official 70mm X-Reading slip.
   - Kicks drawer for cash transfer.
   - Logs out outgoing cashier and prompts incoming cashier to log in.

### 3.4 End of Day Closing: Z-Reading (Close Store)
1. At closing time, tap **`🛑 Z-Read (Close)`** in the header.
2. Enter final cash count.
3. Tap **Finalize Store Closing & Print Official Z-Read**:
   - Prints official BIR Z-Reading slip.
   - Resets daily accumulators and advances the Z-Counter.
   - Archives the daily figures into the Shift History.

---

## 4. Membership Points Allowance System

- Members carry company ID cards with barcodes (e.g. `990001001`).
- Default monthly consumable allowance: **₱1,500.00 / month** (1 point = ₱1.00).
- **Payment Tender**: Select **`🏷 POINTS`** in the checkout payment modal.
- **Split Tender**: If the member's points are insufficient to cover the ticket, the remainder automatically splits to Cash!
- **On-the-Fly Top-Up**: In **`👥 Members`**, managers can tap **`➕ Top-Up`** (+₱200, +₱500, +₱1,000, +₱1,500) or adjust the global default allowance dynamically.

---

## 5. Returns & Refunds (Credit Notes)

1. Tap **`↩ Return (F7)`** in the header.
2. Search or scan the original invoice number (e.g. `BR-001-T1-20260903-0001`).
3. Select items to return and specify the reason (`Defective`, `Wrong Item`, `Change of Mind`).
4. Choose disposition:
   - **📦 Restock to Shelf**: Restores inventory balance.
   - **🗑 Scrap / Waste**: Writes off damaged goods into the scrap audit log.
5. Select refund tender (**Cash** or **Points Re-Credit**).
6. System prints official 70mm Return Slip with customer and supervisor signature lines.

---

## 6. Disaster Recovery & Local SQLite Backup

- Tap **`💾 Backup`** in the POS header.
- Tap **`💾 Create Instant Local Backup Snapshot`**:
  - Generates an encrypted snapshot of products, members, sales, shifts, returns, and inventory ledger.
  - Automatically verifies SHA-256 integrity checksum (`CHK-XXXX`).
- To restore after a tablet hardware replacement:
  - Copy the backup snapshot to the tablet.
  - In Backup modal, select the snapshot and tap **`🔄 Restore`**.

---

## 7. Cloud Deployment (Backend Server)

### 7.1 Environment Variables (`backend/.env`)
```env
PORT=4000
NODE_ENV=production
DATABASE_URL="postgresql://fbcpos_user:SecretPassword@localhost:5432/fbcpos_db?schema=public"
JWT_SECRET="ProductionSuperSecretKey_ChangeInProd"
CORS_ORIGIN="*"
```

### 7.2 Database Migrations & Seeding
```powershell
cd backend
npx prisma migrate deploy
npm run seed
```

### 7.3 Launching Production Server
```powershell
cd backend
npm run build
npm start
```
