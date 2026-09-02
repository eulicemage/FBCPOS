# 06. Inventory Management & Stock Ledger Architecture

## 1. Immutable Stock Movement Principle
**RULE: Never mutate `stock_quantity` directly without recording an immutable audit entry in `stock_movements`.**

Every change to inventory balance represents a physical business event. Recording full movement history guarantees:
1. Complete forensic auditability for stock loss/shrinkage.
2. Safe asynchronous multi-terminal offline synchronization without lost updates.
3. Reliable reconstruction of inventory at any past timestamp.

---

## 2. Stock Movement Taxonomy

| Movement Type | Sign | Description | Mandatory Reference / Metadata |
| :--- | :---: | :--- | :--- |
| `STOCK_IN` | `+` | Receiving supplier delivery / Purchase Order | Supplier Invoice #, PO Number |
| `SALE` | `-` | Point-of-Sale completed transaction | Sale UUID, Invoice Number |
| `RETURN_RESTOCK` | `+` | Customer refund returned to inventory | Return UUID, Original Sale UUID |
| `RETURN_DAMAGE` | `0` | Customer refund written off as damaged | Return UUID, Write-off Reason |
| `ADJUSTMENT_DAMAGE` | `-` | Broken, expired, or spoiled goods write-off | Reason Code, Manager PIN |
| `ADJUSTMENT_AUDIT` | `+/-` | Physical inventory cycle count reconciliation | Count Sheet ID, Variance Explanation |
| `TRANSFER_OUT` | `-` | Stock dispatched to another branch | Destination Branch ID, Dispatch Note # |
| `TRANSFER_IN` | `+` | Stock received from another branch | Origin Branch ID, Transfer Manifest # |

---

## 3. Stock Movement Execution Flow (Local SQLite)

```typescript
export async function executeStockMovement(
  db: SQLiteDatabase,
  movement: {
    branchId: string;
    productId: string;
    terminalId: string;
    userId: string;
    movementType: StockMovementType;
    quantityChange: number;
    referenceId?: string;
    reason?: string;
  }
): Promise<{ previousQuantity: number; newQuantity: number }> {
  return await db.transactionAsync(async (tx) => {
    // 1. Fetch current balance
    const current = await tx.executeAsync(
      'SELECT stock_quantity FROM branch_inventory WHERE branch_id = ? AND product_id = ?',
      [movement.branchId, movement.productId]
    );
    
    const previousQuantity = current.rows[0]?.stock_quantity ?? 0;
    const newQuantity = previousQuantity + movement.quantityChange;

    // 2. Upsert branch_inventory balance
    await tx.executeAsync(
      `INSERT INTO branch_inventory (id, branch_id, product_id, stock_quantity, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(branch_id, product_id) DO UPDATE SET
       stock_quantity = ?, updated_at = datetime('now')`,
      [uuidv4(), movement.branchId, movement.productId, newQuantity, newQuantity]
    );

    // 3. Insert immutable stock movement record
    const movementId = uuidv4();
    await tx.executeAsync(
      `INSERT INTO stock_movements (
        id, branch_id, product_id, terminal_id, user_id,
        movement_type, quantity_change, previous_quantity, new_quantity,
        reference_id, reason, created_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'PENDING')`,
      [
        movementId,
        movement.branchId,
        movement.productId,
        movement.terminalId,
        movement.userId,
        movement.movementType,
        movement.quantityChange,
        previousQuantity,
        newQuantity,
        movement.referenceId || null,
        movement.reason || null
      ]
    );

    // 4. Enqueue to Outbox
    await enqueueSyncEvent(tx, 'STOCK_MOVEMENT', movementId, 'INSERT', {
      id: movementId,
      branchId: movement.branchId,
      productId: movement.productId,
      terminalId: movement.terminalId,
      userId: movement.userId,
      movementType: movement.movementType,
      quantityChange: movement.quantityChange,
      previousQuantity,
      newQuantity,
      referenceId: movement.referenceId,
      reason: movement.reason
    });

    return { previousQuantity, newQuantity };
  });
}
```
