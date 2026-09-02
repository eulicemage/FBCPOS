# 12. REST API Specification & Endpoint Contracts

Base URL: `/api/v1`

## 1. Authentication & Pairing
- `POST /auth/login`
  - Body: `{ username, password }` or `{ terminalId, pin }`
  - Response: `{ accessToken, refreshToken, user: { id, fullName, role, branchId } }`
- `POST /auth/refresh`
  - Body: `{ refreshToken }`
  - Response: `{ accessToken, refreshToken }`
- `POST /auth/terminal/register`
  - Body: `{ deviceUid, activationToken }`
  - Response: `{ terminalId, branchId, terminalNumber, apiSecret }`

## 2. Downstream Delta Catalog Sync
- `GET /catalog/sync?last_pulled_at={ISO_TIMESTAMP}&branch_id={BRANCH_ID}`
  - Response:
    ```json
    {
      "syncedAt": "2026-09-02T17:30:00Z",
      "categories": [ { "id": "...", "name": "...", "code": "...", "colorHex": "#3B82F6", "sortOrder": 1, "isActive": true } ],
      "products": [ { "id": "...", "categoryId": "...", "sku": "...", "barcode": "...", "name": "...", "costPrice": 75.0, "sellingPrice": 95.0, "isTaxable": true, "taxRate": 0.12, "isActive": true } ],
      "users": [ { "id": "...", "username": "...", "fullName": "...", "role": "CASHIER", "pinHash": "...", "isActive": true } ]
    }
    ```

## 3. Upstream Transactional Sync Push (Outbox Batch)
- `POST /sync/push`
  - Header: `Authorization: Bearer <terminal_or_user_jwt>`
  - Body:
    ```json
    {
      "terminalId": "TERM-001",
      "branchId": "BR-001",
      "batch": [
        {
          "id": "QUEUE-UUID-1",
          "entityType": "SALE",
          "entityId": "SALE-UUID-A",
          "payload": {
            "id": "SALE-UUID-A",
            "invoiceNumber": "BR-001-T1-20260902-0042",
            "cashierId": "USER-001",
            "shiftId": "SHIFT-001",
            "subtotalAmount": 535.00,
            "discountAmount": 23.88,
            "taxAmount": 44.46,
            "totalAmount": 487.26,
            "items": [ ... ],
            "payments": [ ... ],
            "createdAt": "2026-09-02T17:15:30Z"
          }
        }
      ]
    }
    ```
  - Response:
    ```json
    {
      "status": "SUCCESS",
      "syncedCount": 1,
      "syncedIds": ["QUEUE-UUID-1"],
      "errors": []
    }
    ```

## 4. Reports & Inventory Management
- `GET /reports/sales/summary?branchId=BR-001&startDate=2026-09-01&endDate=2026-09-02`
- `POST /inventory/movement` — `{ branchId, productId, movementType, quantityChange, reason }`
- `GET /inventory/levels/:branchId` — Returns all stock levels and reorder alerts.
