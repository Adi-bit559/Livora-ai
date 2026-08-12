# Livora AI — Compact Full-Stack Application

India-focused AI Property & Roommate Discovery Platform with **₹0 Brokerage**, **2% Renter Platform Fee**, **Owner Subscriptions (₹99 Basic / ₹199 Pro)**, **TrustScore**, **Predictive Vacancy**, and **Admin Verification**.

---

## 1. Quick Start Guide

### Prerequisites
- **Node.js**: v18+
- **npm**: v9+

### Backend Setup (`/backend`)
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

The backend server will start at `http://localhost:5000`.

### Frontend Setup (`/frontend`)
```bash
cd frontend
npm install
npm run dev
```

The frontend application will start at `http://localhost:5173`.

---

## 2. Health Check Endpoint
```http
GET http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "database": "connected",
  "application": "Livora AI"
}
```

---

## 3. Database Persistence & Auto-Initialization
- **Database File**: `backend/data/livora.db` (SQLite)
- **Auto-Initialization**: On startup, the backend verifies that the `data/` directory exists and creates all required SQLite tables and indexes.
- **Seeding Data**: Run `npm run seed` to generate synthetic properties across 15+ major Indian cities (Mumbai, Pune, Bengaluru, Hyderabad, Delhi NCR, etc.).

---

## 4. Monetization & Business Model

### Renters
- **Brokerage**: Always **₹0**.
- **Platform Fee**: **2% of Monthly Rent** only (Formula: `platformFee = Math.round(monthlyRent * 0.02)`). Applied only to successful/confirmed bookings.
- **Example Price Breakdown**:
  - Monthly Rent: ₹15,000
  - Security Deposit: ₹10,000
  - Livora Platform Fee (2%): ₹300
  - Brokerage: ₹0
  - **Total**: ₹25,300

### Property Owners
- **Free Trial**: **7 Days FREE** upon owner registration (Status: `TRIAL`, Limit: 2 active properties).
- **Basic Plan**: **₹99 / month** (Up to 2 active properties, room management, booking management, TrustScore, vacancy prediction).
- **Pro Plan**: **₹199 / month** (Up to 10 active properties, featured property option, advanced analytics, priority discovery).
- **Subscription Access Control**:
  - Expired owners retain access to historical data, bookings, and dashboard, but cannot publish new properties or create active listings.
  - Property limits enforced (Basic: 2, Pro: 10). Prompts owner to upgrade when limit reached.

---

## 5. Development Demo Accounts

| Role | Email | Password | Details |
|---|---|---|---|
| **Renter** | `renter@demo.livora.ai` | `Demo@12345` | Preset renter account with profile & roommate preferences |
| **Owner** | `owner@demo.livora.ai` | `Demo@12345` | Active PRO subscription owner with properties & analytics |
| **Admin** | `admin@demo.livora.ai` | `Demo@12345` | System administrator with revenue dashboard & verifications |

---

## 6. Main API Routes

### Authentication
- `POST /api/auth/register` — Register RENTER or OWNER (auto-assigns 7-day trial)
- `POST /api/auth/login` — Login & receive JWT access token
- `GET /api/auth/me` — Fetch current user profile & active subscription

### Properties & Search
- `GET /api/properties` — Search properties with filters (city, locality, rent, propertyType, ac, food, powerBackup, verified)
- `GET /api/properties/:id` — Property details, TrustScore, vacancy prediction, rooms, amenities, reviews
- `POST /api/properties` — Create property (OWNER/ADMIN only; enforces subscription limits)
- `GET /api/properties/:id/trust-score` — 0–100 TrustScore calculation
- `GET /api/properties/:id/vacancy` — Predictive vacancy estimation

### Bookings & Pre-Booking
- `POST /api/bookings` — Confirms booking with 2% platform fee & ₹0 brokerage
- `GET /api/bookings` — List bookings for current renter or owner

### Owner Subscriptions & Dashboard
- `GET /api/owner/subscription` — View plan, status, properties used/limit, trial remaining days
- `POST /api/owner/subscription/subscribe` — Demo payment subscribe to BASIC (₹99) or PRO (₹199)
- `GET /api/owner/analytics` — Owner occupancy rate, revenue, total bookings
- `POST /api/owner/properties/:id/rooms` — Add rooms to property

### Admin Verification & Revenue
- `GET /api/admin/verifications` — List pending owner property verification requests
- `PATCH /api/admin/properties/:id/verify` — Set status `VERIFIED` & `isVerified = true` (displays **✓ Livora Verified** badge)
- `PATCH /api/admin/properties/:id/reject` — Set status `REJECTED`
- `GET /api/admin/revenue` — Live Demo Revenue breakdown (Subscription revenue, Platform fee revenue, Total revenue)
