# 04. Product Catalog and Master Data Taxonomy

## 1. Product Entity Schema

Each product in FoodBaskets Corp POS carries master attributes defined centrally and synchronized locally to every terminal.

```typescript
export interface Product {
  id: string;                 // UUIDv4 (Central Master Identifier)
  categoryId: string;         // Foreign Key -> Category
  sku: string;                // Stock Keeping Unit, unique (e.g., "BEV-00124")
  barcode: string;            // Primary Barcode (EAN-13, UPC-A, Code 128)
  name: string;               // Display Name (e.g., "Cow's Milk 1L")
  description?: string;       // Detailed description / packaging notes
  costPrice: number;          // Base acquisition cost (e.g., 75.00)
  sellingPrice: number;       // Default retail selling price (e.g., 95.00)
  isTaxable: boolean;         // Tax applicability flag (true for standard items)
  taxRate: number;            // Applicable VAT rate (e.g., 0.12 for 12% VAT)
  unitOfMeasure: string;      // "PCS", "KG", "PACK", "BOX", "BOTTLE"
  isActive: boolean;          // Soft-delete flag (inactive items are hidden from POS)
  createdAt: string;          // ISO-8601 Timestamp
  updatedAt: string;          // ISO-8601 Timestamp for delta sync
}
```

---

## 2. Category Hierarchy
Categories allow fast visual navigation on the tablet screen:
- `id`: UUID
- `name`: Category Name (e.g., `Beverages`, `Bakery & Pastries`, `Dairy & Eggs`, `Fresh Produce`, `Canned Goods`, `Household & Cleaning`)
- `code`: Short 3-4 letter code (e.g., `BEV`, `BAK`, `DAI`, `FRU`, `CAN`, `HOU`)
- `colorHex`: Visual color indicator for tablet category buttons (e.g., `#3B82F6`, `#10B981`, `#F59E0B`)
- `icon`: Icon identifier (e.g., `coffee`, `shopping-bag`, `egg`, `apple`)
- `sortOrder`: Priority ranking on the POS category ribbon (1, 2, 3...)

---

## 3. Barcode and SKU Lookup Performance
In a production grocery and retail environment with $> 10,000$ active SKUs, product lookup latency is critical:
1. **Direct SQLite B-Tree Index**: `CREATE UNIQUE INDEX idx_products_barcode ON products(barcode);`
2. **Compound Index for Category Navigation**: `CREATE INDEX idx_products_category ON products(category_id, sort_order, name);`
3. **SQLite FTS5 (Full-Text Search)**: Virtual search table enabling instant fuzzy/prefix search for cashier text queries:
   ```sql
   CREATE VIRTUAL TABLE products_fts USING fts5(
       product_id UNINDEXED,
       sku,
       barcode,
       name,
       tokenize = 'porter unicode61'
   );
   ```
4. **Performance Target**:
   - Barcode Scan Lookup: $< 5\text{ms}$
   - Full-text Query: $< 15\text{ms}$
