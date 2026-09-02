# 09. Offline Resilience & Fault-Tolerant Operations

## 1. Zero Cloud Dependency Architecture
In the event of network disruption, Wi-Fi outage, or cloud server downtime, the FoodBaskets Corp POS terminal operates completely unhindered:

1. **Local Authentication**: Cashier logs in using a 4/6-digit numeric PIN verified against salted SHA-256 hashes stored in the local SQLite `users` table.
2. **Local Master Data**: 100% of product records, prices, barcodes, categories, and tax rules reside in local SQLite B-Tree indices and FTS5 search tables.
3. **Local Cart & Checkout**: All discounts, tax calculations, tender allocations, and change math occur in-memory and commit to local SQLite with full ACID transaction guarantees.
4. **Local Hardware Execution**: Receipt printing and cash drawer triggers communicate directly over local LAN (TCP Port 9100), Bluetooth RFCOMM, or USB OTG without touching the Internet.
5. **Local Shifts & Closing**: Shift opening floats, cash drops, and end-of-shift Z-Reading reconciliation are completed and saved locally.

---

## 2. Recovery on Unexpected Power Loss or Tablet Crash
To protect against sudden tablet battery drain or Android OS termination mid-transaction:
- **Draft Cart Persistence**: Whenever an item is added, removed, or quantity changed, the active cart state is serialized to SQLite `active_cart_draft`.
- **Auto-Recovery on App Launch**: Upon opening FBCPOS, if an unfinalized cart exists in `active_cart_draft`, the cashier is prompted: *"Unfinished sale detected from 17:14. Restore cart?"*
