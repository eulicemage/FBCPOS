# FoodBaskets Corp — Multi-Branch Android Tablet POS (FBCPOS)

A production-grade, offline-first Android Tablet Point of Sale (POS) system engineered for 18 branches and ~22 POS terminals with centralized cloud PostgreSQL backend and asynchronous bidirectional synchronization.

---

## 🏢 Enterprise Architecture Overview

```
                                +-----------------------------------+
                                |    CENTRAL CLOUD BACKEND (Node)   |
                                |   PostgreSQL 16 Multi-Branch DB   |
                                +-----------------+-----------------+
                                                  ^
                                                  | HTTPS / REST (JWT + Idempotency)
                                                  v
                     +----------------------------+----------------------------+
                     |                                                         |
         +-----------+-----------+                                 +-----------+-----------+
         |  BRANCH 001 (Main)    |                                 |   BRANCH 002 to 018   |
         | Terminals: 1 & 2      |                                 | Terminals: 1 each     |
         +-----------+-----------+                                 +-----------+-----------+
                     |                                                         |
           +---------+---------+                                               |
           |                   |                                               |
     +-----+-----+       +-----+-----+                                   +-----+-----+
     | POS TERM 1|       | POS TERM 2|                                   | POS TERM  |
     |  (Tablet) |       |  (Tablet) |                                   |  (Tablet) |
     |  SQLite   |       |  SQLite   |                                   |  SQLite   |
     +-----------+       +-----------+                                   +-----------+
```

---

## 📁 Repository Structure

```
FBCPOS/
├── docs/                        # Complete System Architecture & Specifications
│   ├── 01_requirements.md       # POS Functional & Non-Functional Requirements
│   ├── 02_user_roles_permissions.md # RBAC Matrix & PIN Hierarchy
│   ├── 03_branch_and_terminal_structure.md # 18 Branch Topology & Terminal Pairing
│   ├── 04_product_catalog_structure.md # Taxonomy, Barcodes, & Search Indexing
│   ├── 05_sales_and_checkout_workflow.md # Fast Cashier Journey & Cart Math
│   ├── 06_inventory_management_workflow.md # Immutable Stock Ledger & Movements
│   ├── 07_payment_and_tender_workflow.md # Cash, Card, E-Wallets, Change Rules
│   ├── 08_receipt_and_hardware_workflow.md # ESC/POS Printers & Cash Drawers
│   ├── 09_offline_resilience_workflow.md # Zero-Connection Selling & Draft Recovery
│   ├── 10_synchronization_strategy.md # Outbox Pattern & Delta Sync Engine
│   ├── 11_database_schemas.md   # PostgreSQL & SQLite Table Definitions
│   └── 12_api_specification.md  # REST API Endpoint Contracts
├── backend/                     # Node.js + Express + TypeScript Backend
│   ├── prisma/
│   │   ├── schema.prisma        # Prisma PostgreSQL Cloud Schema
│   │   └── seed.ts              # 18-Branch Seed Data & Demo Products
│   ├── src/
│   │   ├── config/              # Environment & DB Pool Configuration
│   │   ├── controllers/         # Auth, Catalog, Sync, Shift, Inventory Controllers
│   │   ├── middleware/          # JWT Auth, RBAC, Error Handling, Request Logging
│   │   ├── routes/              # Express API Route Handlers
│   │   ├── services/            # Sync Engine, Math, Inventory, Auth Services
│   │   ├── types/               # TypeScript DTOs & Domain Interfaces
│   │   ├── utils/               # Idempotency, Crypto, Response Wrappers
│   │   └── server.ts            # Server Entry Point
│   ├── Dockerfile
│   ├── docker-compose.yml       # PostgreSQL 16 Dev Container
│   ├── package.json
│   └── tsconfig.json
├── mobile/                      # React Native Android Tablet POS Application
│   ├── src/
│   │   ├── components/          # Touch-Friendly Tablet UI Elements
│   │   ├── config/              # Device & Terminal Configuration
│   │   ├── database/            # SQLite Storage Layer, Schema, Outbox Queue
│   │   ├── screens/             # POSScreen, LoginScreen, ShiftClose, History
│   │   ├── services/            # ESC/POS Printer Driver, Sync Client Worker
│   │   ├── store/               # Zustand Reactive State Stores (Cart, Auth, Shift)
│   │   └── types/               # Mobile TypeScript Domain Types
│   ├── App.tsx                  # Application Root & Hardware Listener Hook
│   ├── package.json
│   └── tsconfig.json
└── shared/                      # Common TypeScript Types & Business Calculation Logic
    ├── src/
    │   ├── calculations.ts      # Shared VAT, Discount, & Change Rounding Engine
    │   ├── enums.ts             # Roles, PaymentMethods, MovementTypes
    │   └── interfaces.ts        # Common Data Models
    ├── package.json
    └── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+ LTS
- PostgreSQL 16 (or Docker)
- Android SDK (for building Android Tablet APK)

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env

# Start development database
docker-compose up -d

# Run database migrations and seed 18 branches
npx prisma migrate dev --name init
npx prisma db seed

# Start development server
npm run dev
# Server running at http://localhost:4000/api/v1
```

### 3. Mobile POS Setup
```bash
cd mobile
npm install

# Start Metro Bundler
npm start

# Run on Android Tablet / Emulator
npm run android
```

---

## 🛡️ License & Commercial Rights
Copyright © 2026 FoodBaskets Corp. All rights reserved. Proprietary and Confidential.