# Soostori Platform — Architecture v2.0

> **Status:** Draft — awaiting team review
> **Last Updated:** 2026-08-03
> **Author:** AI (Claude Code)

---

## 1. Vision

Soostori is a **tri-platform POS and business management system** designed for offline-first operation across mobile and desktop, with a web dashboard for administration and oversight.

The system is built around three core user types — **super admins** (the Soostori team), **shop owners** (businesses running POS), and **salespeople** (enrollment agents). Every install authenticates monthly to validate its eligibility, preventing unauthorized usage without requiring a persistent internet connection.

---

## 2. Technology Stack

### 2.1 Backend (Self-Hosted on VPS)

The entire backend runs on your existing VPS. **No external BaaS.** No Convex, no Supabase cloud.

| Component | Technology | What It Does |
|-----------|-----------|-------------|
| **API Server** | `fidscript_api` (Go) — **extended** | Auth, eligibility, M-Pesa, sync, CRUD |
| **Database** | `fidscript_postgres` (PostgreSQL) | Primary data store — Soostori schema |
| **Connection Pooler** | `fidscript_pgbouncer` | Handles many concurrent POS connections efficiently |
| **Cache + Pub/Sub** | `fidscript_redis` | Session cache, realtime pub/sub for sync |
| **Media CDN** | **Cloudinary** | Product images, receipts, optimized delivery |
| **Email (OTP)** | **Resend** | Transactional email — magic code OTP delivery |
| **Email (relay)** | `fidscript_stalwart` | SMTP relay — optional backup for Stalwart |
| **Reverse Proxy** | `fidscript_traefik` | Routes domains, handles SSL termination |
| **Payments** | **Tuma API (M-Pesa STK Push)** | M-Pesa via `api.tuma.co.ke` — all calls server-side |

### 2.2 Frontend Apps

| App | Technology | Purpose |
|-----|-----------|---------|
| **soostori-desktop** | Electron + Vite | Windows POS — offline-first SQLite |
| **soostori-mobile** | React Native (Expo) | Mobile POS — offline-first |
| **soostori-web** | React + Vite | Admin dashboards only — no POS |
| **soostori-updates** | Node.js (Express) + static files | Self-hosted update server |

---

## 3. The Five Products

### 3.1 `soostori-desktop` — Desktop POS App

**Purpose:** Full-featured offline POS for Windows PCs. Receipt printers, barcode scanners, full business logic.

**Tech:** Electron + Vite + better-sqlite3 (local) + Go API (sync)

**Current state:** Already built. To be extended with sync queue layer.

**Core Features:**
- Product catalog with barcode search
- Cart + checkout (cash or M-Pesa)
- ESC/POS receipt printing (USB/Serial)
- Held sales (save cart for later)
- Customer debt tracking
- Daily sales summary
- Offline queue — all transactions stored locally, synced when online
- Monthly eligibility re-validation

**Offline Behavior:**
- Full POS without internet
- SQLite stores all transactions locally
- Sync queue table tracks unsynced changes
- On reconnect: background sync to Go API

---

### 3.2 `soostori-mobile` — Mobile POS App

**Purpose:** The primary POS for shop attendants on mobile devices. Fully offline-capable.

**Tech:** React Native (Expo) + expo-sqlite or WatermelonDB (local) + Go API (sync)

**Core Features:**
- All desktop POS features
- Receipt generation (share as image or print via Bluetooth)
- Barcode scanning via device camera
- Monthly eligibility re-validation
- Offline queue — same pattern as desktop

---

### 3.3 `soostori-web` — Admin Dashboard

**Purpose:** Central administration. No POS functionality.

**Three Portals:**

| Portal | Access | Capabilities |
|--------|--------|-------------|
| **Super Admin** | Soostori team only | Full system visibility, all shops, subscriptions, app releases |
| **Shop Owner Admin** | Shop owners | Their shop's inventory, reports, staff, subscription status |
| **Salesperson** | Enrollment agents | Enroll new shop owners, track enrollment progress |

**Tech:** React + Vite, calls Go API directly (always online)

---

### 3.4 `soostori-updates` — Self-Hosted Update Server

**Purpose:** Distribute app updates without Play Store / App Store dependency.

**Structure:**
```
updates.example.com/
├── api/
│   ├── latest          → JSON: latest version per platform
│   └── changelog/:v    → JSON: changelog for version
├── windows/
│   ├── latest.yml      → Electron Builder update manifest
│   ├── app-X.Y.Z.exe
│   └── app-X.Y.Z.exe.sig
├── android/
│   ├── latest.json
│   └── app-vX.Y.Z.apk
└── changelog/
    └── X.Y.Z.json
```

**Desktop Update Flow:**
1. App starts → `GET /api/latest?platform=windows&currentVersion=X.Y.Z`
2. If newer → show update dialog with changelog
3. User clicks "Update" → downloads EXE in background
4. Verifies SHA256/signature → installs on restart

**Android Update Flow:**
1. App starts → `GET /android/latest.json`
2. If newer → downloads APK with progress indicator
3. On completion → opens Android installer (user must confirm)
4. Installed after user approval

**iOS:** TestFlight during beta. App Store or Enterprise Program for production.

---

### 3.5 `fidscript_api` (Go) — Backend API

**Purpose:** Central backend for all Soostori services — auth, sync, M-Pesa, CRUD.

**This is your existing `fidscript_api` (Go) — extended with Soostori endpoints.**

**Route:** `/api/soostori/*` via Traefik

**No new containers needed.** The Go API is extended, Postgres schema is added.

---

## 4. User Roles & Access Matrix

| User Type | Web Dashboard | Mobile POS | Desktop POS | Can Enroll Shops |
|-----------|-------------|-----------|-------------|-----------------|
| **Super Admin** | ✅ Full admin | ❌ | ❌ | ❌ |
| **Shop Owner Admin** | ✅ Their shop only | ✅ Full POS | ✅ Full POS | ❌ |
| **Salesperson** | ✅ Enrollment only | ❌ | ❌ | ✅ |
| **Shop Attendant** | ❌ | ✅ POS only | ✅ POS only | ❌ |

---

## 5. Data Architecture (PostgreSQL)

### 5.1 Soostori Postgres Schema

All tables live in a `soostori` schema on your existing `fidscript_postgres`.

```
soostori.users
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  email           VARCHAR(255) UNIQUE NOT NULL
  password_hash   VARCHAR(255)          -- bcrypt, or NULL if magic code only
  role            VARCHAR(50) NOT NULL  -- 'super_admin', 'shop_owner', 'salesperson', 'attendant'
  business_id     UUID REFERENCES soostori.businesses(id)
  created_at      TIMESTAMPTZ DEFAULT NOW()
  last_login_at   TIMESTAMPTZ
  is_eligible     BOOLEAN DEFAULT true
  subscription_expires_at TIMESTAMPTZ
  last_eligibility_check TIMESTAMPTZ
  otp_code        VARCHAR(6)
  otp_expires_at  TIMESTAMPTZ

soostori.businesses
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name            VARCHAR(255) NOT NULL
  owner_id        UUID REFERENCES soostori.users(id)
  plan            VARCHAR(50) DEFAULT 'trial'  -- 'trial', 'monthly', 'annual'
  created_at      TIMESTAMPTZ DEFAULT NOW()
  is_active       BOOLEAN DEFAULT true

soostori.salespeople
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         UUID REFERENCES soostori.users(id) UNIQUE
  business_id     UUID REFERENCES soostori.businesses(id)
  enrolled_shops  UUID[] DEFAULT '{}'
  created_at      TIMESTAMPTZ DEFAULT NOW()

soostori.products
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  business_id     UUID REFERENCES soostori.businesses(id)
  name            VARCHAR(255) NOT NULL
  barcode         VARCHAR(100)
  sku             VARCHAR(100)
  category        VARCHAR(100)
  buy_price       DECIMAL(12,2) DEFAULT 0
  sell_price      DECIMAL(12,2) NOT NULL
  stock           INTEGER DEFAULT 0
  image_url       TEXT              -- Cloudinary URL (uploaded via signed URL)
  is_active       BOOLEAN DEFAULT true
  created_at      TIMESTAMPTZ DEFAULT NOW()
  updated_at      TIMESTAMPTZ DEFAULT NOW()

soostori.categories
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  business_id     UUID REFERENCES soostori.businesses(id)
  name            VARCHAR(100) NOT NULL
  description     TEXT
  created_at      TIMESTAMPTZ DEFAULT NOW()

soostori.sales
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  local_id        UUID              -- client-generated UUID (before sync)
  business_id     UUID REFERENCES soostori.businesses(id)
  attendant_id    UUID REFERENCES soostori.users(id)
  items           JSONB NOT NULL    -- [{productId, name, qty, price, subtotal}]
  total_amount    DECIMAL(12,2) NOT NULL
  payment_method  VARCHAR(20)       -- 'cash', 'mpesa'
  mpesa_receipt   VARCHAR(100)
  mpesa_merchant_request_id  VARCHAR(100)
  mpesa_checkout_request_id  VARCHAR(100)
  status          VARCHAR(20) DEFAULT 'pending'  -- 'pending', 'completed', 'failed'
  created_at      TIMESTAMPTZ DEFAULT NOW()

soostori.held_sales
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  business_id     UUID REFERENCES soostori.businesses(id)
  attendant_id    UUID REFERENCES soostori.users(id)
  items           JSONB NOT NULL
  created_at      TIMESTAMPTZ DEFAULT NOW()

soostori.debts
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  local_id        UUID
  business_id     UUID REFERENCES soostori.businesses(id)
  customer_name   VARCHAR(255) NOT NULL
  customer_phone  VARCHAR(20)
  items           JSONB NOT NULL
  total_amount    DECIMAL(12,2) NOT NULL
  amount_paid     DECIMAL(12,2) DEFAULT 0
  status          VARCHAR(20) DEFAULT 'pending'  -- 'pending', 'partial', 'cleared'
  due_date        TIMESTAMPTZ
  created_at      TIMESTAMPTZ DEFAULT NOW()
  updated_at      TIMESTAMPTZ DEFAULT NOW()

soostori.stock_movements
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  business_id     UUID REFERENCES soostori.businesses(id)
  product_id      UUID REFERENCES soostori.products(id)
  quantity        INTEGER NOT NULL  -- positive=in, negative=out
  reason          VARCHAR(50)      -- 'sale', 'restock', 'adjustment', 'return'
  reference_id    UUID              -- link to sale or debt
  created_at      TIMESTAMPTZ DEFAULT NOW()

soostori.shop_settings
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  business_id     UUID REFERENCES soostori.businesses(id) UNIQUE
  shop_name       VARCHAR(255)
  receipt_footer  TEXT
  printer_type    VARCHAR(50) DEFAULT 'none'  -- 'esc_pos', 'system_print', 'none'
  currency        VARCHAR(10) DEFAULT 'KES'
  tax_rate        DECIMAL(5,2) DEFAULT 0
  updated_at      TIMESTAMPTZ DEFAULT NOW()

soostori.sync_log
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  business_id     UUID REFERENCES soostori.businesses(id)
  device_id       VARCHAR(100)
  payload         JSONB NOT NULL
  action          VARCHAR(20)      -- 'create', 'update', 'delete'
  table_name      VARCHAR(100)
  local_id        UUID              -- client-generated
  server_id       UUID              -- assigned by server
  status          VARCHAR(20) DEFAULT 'pending'  -- 'pending', 'synced', 'conflict', 'failed'
  error           TEXT
  created_at      TIMESTAMPTZ DEFAULT NOW()
  synced_at       TIMESTAMPTZ

soostori.app_versions
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  version         VARCHAR(20) NOT NULL
  platform        VARCHAR(20) NOT NULL  -- 'windows', 'mac', 'android', 'ios'
  minimum_version VARCHAR(20)
  mandatory       BOOLEAN DEFAULT false
  download_url    TEXT NOT NULL
  changelog_url   TEXT
  sha256          VARCHAR(64)
  size_bytes      BIGINT
  released_at     TIMESTAMPTZ DEFAULT NOW()
  is_active       BOOLEAN DEFAULT true
```

### 5.2 Row-Level Security (Postgres RLS)

All Soostori tables have **Postgres Row-Level Security** enforced:

```sql
-- Example: users can only see their own business data
ALTER TABLE soostori.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_visibility ON soostori.products
  USING (business_id = current_setting('soostori.business_id')::uuid);
```

RLS is the anti-piracy layer — **server-enforced, not client-enforced.**

### 5.3 Media Storage (Cloudinary Only)

All product images and receipt files are stored in **Cloudinary**.

```
Cloudinary folder structure:
  soostori/
    products/{business_id}/{product_id}/image.jpg
    receipts/{business_id}/{sale_id}/{timestamp}.jpg
```

**Upload Flow:**
```
1. Client → POST /api/soostori/media/upload-url { businessId, filename, contentType }
2. Go API generates Cloudinary signed upload URL → returns to client
3. Client → PUT directly to Cloudinary using signed URL (image bytes)
4. Cloudinary returns final URL
5. Client → POST /api/soostori/products (or /sales) with Cloudinary URL in imageUrl field
```

**Cloudinary is also used for:**
- Product image optimization + CDN delivery
- Receipt image generation (desktop app generates receipt → uploads → shares link)
- Report exports (PDF/images via Cloudinary transformation)

**Credentials:** (add when ready)
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=soostori_unsigned  # or signed
```

### 5.4 Tuma M-Pesa Integration (Server-Side Only)

All M-Pesa calls happen **exclusively in the Go API** — never from clients.

**Tuma credentials stored as Go API environment variables:**
```
TUMA_EMAIL=fidscript@example.com
TUMA_API_KEY=your-tuma-api-key
TUMA_CALLBACK_URL=https://api.example.com/api/soostori/tuma/callback
```

**STK Push Flow:**
```
1. POS client → POST /api/soostori/payments/stk-push { amount, phone, saleId }
2. Go API → POST https://api.tuma.co.ke/auth/token (cache JWT)
3. Go API → POST https://api.tuma.co.ke/payment/stk-push
4. Tuma → returns merchantRequestId + checkoutRequestId
5. Go API → updates sale record with pending status
6. Tuma → POST callback to Go API (/api/soostori/tuma/callback)
7. Go API → updates sale status: completed or failed
8. POS client polls or receives webhook for result
```

---

## 6. Auth & Eligibility System

### 6.1 Magic Code Auth (Resend)

```
Sign-in flow:
1. User enters email
2. Go API generates 6-digit OTP, stores with expiry (15 min)
3. Go API calls Resend API → sends email with OTP code
4. User enters OTP
5. Go API verifies code → creates session (JWT), returns to client
6. JWT stored client-side, refreshed on expiry
```

**Resend for OTP email delivery.** Stalwart (fidscript_stalwart) handles other transactional emails if needed.

### 6.2 Eligibility Validation (Server-Side, Anti-Piracy)

This runs **in the Go API** — not in client code. Impossible to bypass.

```
validateEligibility(userId):
1. Look up user → check subscription_expires_at
2. If expired → return { eligible: false, reason: "subscription_expired" }
3. If active → return { eligible: true, expiresAt, plan }
4. Update users.is_eligible = true, last_eligibility_check = NOW()
```

**Client enforcement:**
```
On app launch:
  → if online: POST /api/soostori/auth/validate-eligibility
  → if !eligible: block POS features, show "Re-activate" screen
  → require user to sign in on web to renew

On reconnect (after 30+ days offline):
  → auto-trigger eligibility check
  → if failed: read-only mode until revalidated
```

---

## 7. Payments — Tuma M-Pesa

### 7.1 Checkout with M-Pesa

```
1. Cart → "Pay with M-Pesa" → enter phone number
2. Client → POST /api/soostori/payments/stk-push
3. Go API calls Tuma → sends USSD prompt to customer phone
4. Sale status = 'pending'
5. Customer enters PIN on phone
6. Tuma POSTs callback to Go API
7. Go API updates sale → 'completed' or 'failed'
8. Client polls or receives SSE/webhook for result
```

### 7.2 Checkout with Cash

```
1. Cart → "Pay with Cash"
2. Client → POST /api/soostori/sales { paymentMethod: 'cash' }
3. Sale → status = 'completed' immediately
4. Receipt printed/generated
```

---

## 8. Offline Sync Strategy

### 8.1 Client-Local Database

| App | Local DB | Why |
|-----|---------|-----|
| Desktop | better-sqlite3 (SQLite) | Already implemented, full offline |
| Mobile | expo-sqlite / WatermelonDB | Best offline for React Native |

### 8.2 Sync Queue (Local)

Every write creates a record in the local sync queue:

```sql
-- Local sync_queue table (same on Desktop + Mobile)
CREATE TABLE sync_queue (
  id          TEXT PRIMARY KEY,       -- UUID generated client-side
  table_name  TEXT NOT NULL,
  action      TEXT NOT NULL,         -- 'create' | 'update' | 'delete'
  payload     TEXT NOT NULL,         -- JSON
  status      TEXT DEFAULT 'pending',
  created_at  INTEGER NOT NULL,      -- unix timestamp ms
  synced_at   INTEGER
);
```

### 8.3 Sync Algorithm

```
On write (offline or online):
1. Write to local SQLite → instant UI update
2. Insert into local sync_queue → status 'pending'
3. If online → immediately attempt sync
4. If offline → queued until reconnect

On reconnect:
1. For each pending sync_queue item:
   → POST /api/soostori/sync { items[] }
2. Go API processes batch, assigns server IDs
3. Response: { localId → serverId mapping }
4. Client updates local records with server IDs
5. Client marks sync_queue items as 'synced'

Conflict resolution:
- Reference data (products, prices, categories): SERVER wins
- Transaction data (sales, debts): CLIENT wins, server stores both versions
- Held sales: CLIENT wins (very unlikely to conflict)
```

### 8.4 Eligibility Cache (Offline)

```
localStorage / AsyncStorage:
  lastEligibilityCheck: timestamp (ms)
  cachedEligibility: { eligible: boolean, expiresAt: string, plan: string }
  isEligible: boolean (derived)

On app start:
  if (now - lastEligibilityCheck > 30 days) AND (isOffline):
    show warning banner "Reconnect to verify subscription"
  else if (isOnline):
    call validateEligibility() → update cache
```

---

## 9. Build Sequence

> **Priority: Offline-First.** Each phase builds a complete, working system. Connectivity is added later — it is never the foundation.

```
Phase 1: soostori-desktop (START HERE) ← FULL OFFLINE APP
├── Audit existing codebase (SQLite schema, POS features)
├── Add local sync_queue SQLite table
├── All existing POS features work without internet
└── ZERO server calls — just offline storage + sync queue structure

Phase 2: soostori-mobile (OFFLINE APP)
├── Scaffold React Native (Expo) project
├── Copy Desktop's SQLite schema (same offline-first pattern)
├── Build same POS screens as Desktop (cart, checkout, receipts, inventory, debts)
├── Add same local sync_queue table
└── ZERO server calls until Phase 3

Phase 3: soostori-backend (fidscript_api — Go)
├── Add soostori Postgres schema to existing fidscript_postgres
├── Add /api/soostori/* routes to Go API
├── Magic code auth (OTP via Resend) — credentials added later
├── Eligibility validation (server-side, anti-piracy) — hardcoded initially
├── Tuma M-Pesa — stubbed initially (credentials added later)
├── Sync endpoint (receive queued items from Desktop + Mobile)
└── No new containers — extend existing Go API

Phase 4: Connect Desktop + Mobile to Backend
├── Add HTTP sync worker to Desktop (POST /api/soostori/sync)
├── Add HTTP sync worker to Mobile
├── Add eligibility check on app launch (stubbed)
├── Test offline → online sync flow
└── Now apps need internet — but work fully offline until connected

Phase 5: soostori-web (Admin Dashboards)
├── Super admin portal (all shops, all data)
├── Shop owner portal (their shop only)
├── Salesperson enrollment portal
└── All connected to Go API — always online

Phase 6: soostori-updates (Self-Hosted Update Server)
├── Scaffold Node.js + Express + static files
├── Serve via Traefik on updates subdomain
├── Admin upload UI in soostori-web
└── Desktop/Mobile check for updates on launch
```

---

## 9.1 Credential Keys (Add When Available)

All credentials are stored as **environment variables** — never in code.

| Service | Environment Variable | Status |
|---------|-------------------|--------|
| **Resend** | `RESEND_API_KEY` | Needed for magic code OTP |
| **Cloudinary** | `CLOUDINARY_CLOUD_NAME` | Needed for image uploads |
| | `CLOUDINARY_API_KEY` | |
| | `CLOUDINARY_API_SECRET` | |
| **Tuma M-Pesa** | `TUMA_EMAIL` | Needed for M-Pesa payments |
| | `TUMA_API_KEY` | |
| | `TUMA_CALLBACK_URL` | |
| **Go API** | `SOOSTORI_JWT_SECRET` | For signing auth tokens |
| | `SOOSTORI_DB_SCHEMA` | Postgres schema name |
| **Domain** | `SOOSTORI_API_URL` | e.g. `https://api.soostori.com` |

**All credentials are added as Phase 3 progresses.** For now (Phase 1 & 2), everything works offline with zero external dependencies.

---

## 10. Project Directory Structure

```
soostori/
│
├── soostori-desktop/              # Electron POS app (THIS APP)
│   ├── electron/
│   │   ├── main.ts              # App entry, window, IPC
│   │   ├── preload.ts           # Secure contextBridge
│   │   ├── database/
│   │   │   └── index.ts         # SQLite schema + sync_queue table
│   │   ├── hardware/
│   │   │   └── printer.ts       # ESC/POS commands
│   │   └── ipc-handlers/
│   │       ├── database-handlers.ts
│   │       ├── hardware-handlers.ts
│   │       └── app-handlers.ts
│   ├── src/
│   │   ├── App.tsx              # Main layout + sidebar navigation
│   │   ├── main.tsx             # React entry
│   │   ├── index.css
│   │   ├── pages/              # POS, Inventory, Reports, Settings
│   │   │   ├── pos/
│   │   │   ├── inventory/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── hooks/               # React Query hooks
│   │   ├── lib/
│   │   │   ├── types.ts
│   │   │   ├── api.ts          # IPC bridge to main process
│   │   │   └── utils.ts
│   │   └── components/
│   └── package.json
│
├── soostori-mobile/              # React Native Expo POS (NOT BUILT YET)
│   ├── app/
│   │   ├── (tabs)/
│   │   ├── pos/
│   │   └── settings/
│   ├── src/
│   │   ├── local-db/           # WatermelonDB / expo-sqlite schema
│   │   ├── sync/               # Sync queue + worker
│   │   ├── api/                # Go API client
│   │   └── lib/
│   └── package.json
│
├── soostori-web/                 # React admin dashboards (NOT BUILT YET)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── super-admin/
│   │   │   ├── shop-owner/
│   │   │   └── salesperson/
│   │   ├── lib/
│   │   │   └── api.ts         # Go API client
│   │   └── App.tsx
│   └── package.json
│
├── soostori-updates/             # Self-hosted update server (NOT BUILT YET)
│   ├── src/
│   │   ├── server.js           # Express server
│   │   ├── routes/
│   │   │   ├── latest.js
│   │   │   └── changelog.js
│   │   └── middleware/
│   ├── uploads/                 # EXE + APK files
│   └── package.json
│
├── fidscript_api/                # Go API — EXTEND with Soostori routes
│   ├── handlers/
│   │   ├── soostori/
│   │   │   ├── auth.go         # Magic code OTP
│   │   │   ├── eligibility.go  # Subscription validation
│   │   │   ├── products.go
│   │   │   ├── sales.go
│   │   │   ├── payments.go     # Tuma M-Pesa
│   │   │   └── sync.go
│   │   └── tuma_callback.go
│   ├── middleware/
│   │   └── soostori_auth.go
│   └── main.go
│
├── docs/
│   ├── ARCHITECTURE.md          # This file
│   ├── decisions/
│   ├── POS-README.md
│   ├── Inventory-README.md
│   ├── Debt-README.md
│   ├── Settings-README.md
│   └── Reports-README.md
│
└── README.md
```

---

## 11. Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend | Self-hosted — extend fidscript_api (Go) | Your VPS already has Postgres, Redis, Traefik — no new infra needed |
| Database | PostgreSQL (fidscript_postgres) | ACID transactions, Row-Level Security for anti-piracy |
| Auth | Magic code OTP via Resend | Email OTP; WhatsApp auth planned for later |
| Anti-piracy | Server-side eligibility in Go API | Cannot be bypassed — runs on server, not client |
| Payments | Tuma M-Pesa | All calls server-side in Go API — API key never in client |
| Media | Cloudinary | Optimized image delivery, CDN, receipt generation |
| Desktop offline | SQLite (better-sqlite3) | Already implemented, full offline capability |
| Mobile offline | WatermelonDB / expo-sqlite | Best React Native offline DB |
| Sync | Local queue → Go API on reconnect | Offline-first: write locally, sync async |
| Updates | Self-hosted Node.js | Full control, no App Store dependency |

---

## 12. Why NOT Convex / InstantDB

| | Convex | InstantDB | Our Choice: Self-Hosted |
|--|--------|-----------|------------------------|
| Monthly cost | $25+/mo | $30+/mo | $0 (using your VPS) |
| Self-host | No | No | Yes (you own it) |
| Server-side anti-piracy | Yes | No | Yes |
| M-Pesa server-side | Yes (Actions) | No | Yes (Go API) |
| Magic OTP | Yes | Yes | Yes (Resend) |
| Offline-first | Yes | Yes | Yes (SQLite local) |
| Your existing infra | No | No | Yes (everything already there) |

Convex and InstantDB were rejected because:
1. They cost money every month — your VPS already has equivalent infrastructure free
2. Convex cannot be self-hosted
3. InstantDB runs business logic client-side — anti-piracy checks can be bypassed

---

## 13. Open Questions

- [ ] **Resend account** — needed for magic code OTP (Phase 3, not blocking)
- [ ] **Cloudinary account** — needed for image uploads (Phase 3, not blocking)
- [ ] **Tuma account** — needed for M-Pesa (Phase 3, not blocking)
- [ ] **Domain** — what domain for soostori API? (e.g. `api.soostori.com`)
- [x] **Conflict resolution** — server wins for reference data, client wins for transactions. Accepted.
- [ ] **Salesperson enrollment flow** — detailed step-by-step still needs design

---

## 14. Next Steps (Immediate)

1. **Audit soostori-desktop** — verify current SQLite schema, add sync_queue table (Phase 1)
2. **Scaffold soostori-mobile** — Expo project with same offline SQLite schema as Desktop (Phase 2)
3. **Extend fidscript_api** — add soostori schema to Postgres, add `/api/soostori/` routes (Phase 3)
4. **Build sync endpoint** — receive queued items from Desktop + Mobile (Phase 3)
5. **Connect Desktop + Mobile** — add sync worker, test offline → online flow (Phase 4)
6. **Build soostori-web** — admin dashboards connected to Go API (Phase 5)
7. **Build soostori-updates** — update server + admin upload UI (Phase 6)

**Credentials (Resend, Cloudinary, Tuma) added in Phase 3 as environment variables.**

---

*Last updated by: AI (Claude Code) — 2026-08-03*
*Review status: Pending team review*
