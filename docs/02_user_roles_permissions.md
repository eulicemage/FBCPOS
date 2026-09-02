# 02. User Roles, Permissions & Security Hierarchy

## 1. Overview
FBCPOS uses a hierarchical **Role-Based Access Control (RBAC)** architecture supporting four primary user roles across all 18 branches:

1. **ADMIN** (Enterprise System Administrator / Executive Management)
2. **MANAGER** (Branch Store Manager / Assistant Manager)
3. **CASHIER** (Terminal Operator / Checkout Staff)
4. **AUDITOR** (Internal Auditor / Inventory Controller)

---

## 2. Granular Permissions Matrix

| Permission Key | Description | Admin | Manager | Cashier | Auditor |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `pos.sales.create` | Add products, scan barcodes, and process customer sales | Yes | Yes | Yes | No |
| `pos.sales.discount.statutory` | Apply Senior Citizen & PWD discounts with ID validation | Yes | Yes | Yes | No |
| `pos.sales.discount.custom` | Apply custom percentage or fixed-amount discounts | Yes | Yes | Max 10% | No |
| `pos.sales.void.item` | Void an unsold line item from an active cart | Yes | Yes | Yes | No |
| `pos.sales.void.transaction` | Cancel or void a finalized transaction (Refund / Return) | Yes | Yes | PIN Req. | No |
| `pos.shift.open` | Open a register shift and enter starting cash float | Yes | Yes | Yes | No |
| `pos.shift.close` | Perform blind cash count and submit shift closing | Yes | Yes | Yes | No |
| `pos.shift.cash_drop` | Record mid-shift cash drop to safe or petty cash pay-out | Yes | Yes | PIN Req. | No |
| `pos.drawer.manual_open` | Manually kick cash drawer without a sale transaction | Yes | Yes | PIN Req. | No |
| `pos.reports.x_reading` | View mid-shift financial snapshot | Yes | Yes | Yes | Yes |
| `pos.reports.z_reading` | View final end-of-day financial reconciliation | Yes | Yes | Own Shift | Yes |
| `catalog.products.view` | View product list, prices, and stock levels | Yes | Yes | Yes | Yes |
| `catalog.products.manage` | Create, edit, activate, or deactivate master products | Yes | Branch Only | No | No |
| `catalog.prices.override` | Set branch-specific promotional pricing | Yes | Yes | No | No |
| `inventory.stock_in` | Record incoming purchase orders and supplier deliveries | Yes | Yes | No | No |
| `inventory.adjust` | Perform stock count adjustments and damage write-offs | Yes | Yes | No | Yes |
| `inventory.transfer` | Initiate or accept inter-branch stock transfers | Yes | Yes | No | No |
| `reports.branch.view` | View branch sales, profit margins, and audit logs | All | Own Branch | No | All |
| `admin.users.manage` | Create users, reset passwords, and assign roles | All | Own Branch | No | No |
| `admin.terminals.manage` | Register, bind, and configure POS terminal hardware | Yes | Own Branch | No | No |

---

## 3. Dual-Tier Authentication Strategy

### 3.1 Cloud Authentication (Online)
- **Identifier**: Username (`maria.santos`) or Email.
- **Credential**: Password hashed using **Argon2id** (or Bcrypt with 12 salt rounds).
- **Session Tokens**:
  - **Access Token**: JWT containing `userId`, `branchId`, `role`, `permissions` array (expires in 15 minutes).
  - **Refresh Token**: Cryptographically secure random 256-bit token stored in cloud database with sliding expiration (7 days).

### 3.2 Offline Terminal Authentication (Local SQLite)
- **Fast Cashier Switching**: 4-digit or 6-digit numeric **PIN Code**.
- **Local Storage**: PIN is stored in local SQLite as a salted SHA-256 hash (`sha256(PIN + user_salt)`).
- **Security Guardrails**:
  - Local PIN hashes are refreshed whenever the terminal syncs downstream catalog and user data.
  - 5 consecutive failed PIN attempts temporarily locks the terminal for 3 minutes to prevent brute-force attacks.

### 3.3 Supervisor PIN Override Flow
When a cashier attempts a restricted operation (such as voiding a finalized receipt or opening the cash drawer without a sale):
1. UI presents an inline modal: *"Supervisor Approval Required"*.
2. A Branch Manager or Administrator enters their 4/6-digit PIN.
3. System verifies PIN locally against manager credentials.
4. An immutable entry is written to `audit_logs` capturing:
   `{ action: "SUPERVISOR_OVERRIDE", requested_by: cashier_id, authorized_by: manager_id, action_type: "VOID_SALE", reason: "Customer changed mind", timestamp: "..." }`.
