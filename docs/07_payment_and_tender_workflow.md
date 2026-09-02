# 07. Payment Methods, Tender & Change Calculation

## 1. Supported Tender Methods

FoodBaskets Corp POS supports flexible payment methods suited for retail operations in the Philippines:

1. **CASH**:
   - Primary payment type.
   - Quick denomination buttons on touch interface: Exact Amount, P50, P100, P200, P500, P1,000, P2,000.
   - Automatically kicks the RJ11 cash drawer upon confirmation.
2. **CREDIT / DEBIT CARD (Offline Reference Tracking)**:
   - Processed via external standalone payment terminal (BDO, Maya, Global Payments).
   - Cashier enters card brand (Visa, Mastercard, BancNet, JCB) + Last 4 digits + Terminal Approval / Reference code.
3. **E-WALLETS / QR PAYMENTS (GCash / Maya)**:
   - Customer scans static QR Ph code on counter.
   - Cashier enters customer's 12-digit transaction reference number.
4. **SPLIT TENDER**:
   - Customer pays part in Cash (e.g., P200) and remainder via E-Wallet / Card (e.g., P350).
   - System validates that $\sum \text{Payment Amounts} \ge \text{Total Due}$ before allowing finalization.

---

## 2. Change Calculation and Rounding Rules
- **Formula**:
  $$\text{Change Amount} = \max(0, \text{Total Amount Tendered} - \text{Total Invoice Amount})$$
- Currency calculations are represented in 2 decimal places ($0.01$ precision).
- Negative change is impossible; system blocks finalization if $\text{Amount Tendered} < \text{Total Due}$.
