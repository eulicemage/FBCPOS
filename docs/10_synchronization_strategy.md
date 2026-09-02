# 10. Offline Synchronization Protocol & Conflict Resolution

## 1. Outbox Pattern Engine (Upstream: POS $\rightarrow$ Cloud)

```mermaid
graph TD
    subgraph "POS Terminal Local SQLite"
        SaleTx["Atomic Checkout Transaction"]
        OutboxTable["sync_queue Table\n(status: PENDING)"]
        
        SaleTx -->|Write within same ACID tx| OutboxTable
    end

    subgraph "Background Worker Client"
        SyncWorker["Sync Worker\n(Runs every 15s or on Network Online)"]
        SyncWorker -->|Read batch of 25 records| OutboxTable
    end

    subgraph "Cloud API & PostgreSQL"
        SyncAPI["POST /api/v1/sync/push"]
        IdempotencyCheck["Idempotency Filter (UUID Check)"]
        CloudDB["PostgreSQL Cloud Database"]
        
        SyncWorker -->|HTTPS Batch Payload| SyncAPI
        SyncAPI --> IdempotencyCheck
        IdempotencyCheck -->|Insert new / Ignore duplicate| CloudDB
        CloudDB -->|Return Acknowledged UUIDs| SyncAPI
    end

    SyncAPI -->|HTTP 200 { syncedIds: [...] }| SyncWorker
    SyncWorker -->|UPDATE sync_queue SET status='COMPLETED'| OutboxTable
```

---

## 2. Exponential Backoff & Retry Logic

When network errors, HTTP 500 timeouts, or intermittent connectivity occur:
- Base Backoff: $2\text{ seconds}$
- Formula: $\text{Delay} = \min(60\text{ seconds}, 2 \times 2^{\text{retry\_count}} + \text{jitter}(0, 1000\text{ms}))$
- Max Retries: Infinite retry with capped 60s delay until connection is re-established.
- Failed sync attempts record `error_message` and increment `retry_count` in `sync_queue` for telemetry without blocking subsequent cashier operations.

---

## 3. High-Watermark Delta Sync (Downstream: Cloud $\rightarrow$ POS)
1. Terminal stores `last_catalog_synced_at` timestamp in SQLite settings.
2. Background sync calls `GET /api/v1/catalog/sync?last_pulled_at={timestamp}&branch_id={branchId}`.
3. Server queries PostgreSQL for rows where `updated_at > last_pulled_at`.
4. Returns payload with:
   - Modified / new categories
   - Modified / new products & prices
   - Modified / deactivated branch staff credentials (PIN hashes)
5. Local SQLite applies changes inside a single fast transaction and updates `last_catalog_synced_at`.
