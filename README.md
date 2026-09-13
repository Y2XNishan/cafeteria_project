# 🍽️ SmartCafé – Smart Demand Forecast & Queue Optimization System

## Project Overview
- **Name**: SmartCafé
- **Goal**: Reduce cafeteria food waste and waiting time through predictive analytics and intelligent queue management
- **Stack**: Hono + TypeScript + Cloudflare Pages + D1 SQLite + TailwindCSS + Chart.js

---

## 🌐 URLs
- **Live App**: `https://3000-i78ydi2myp3w990rhjubl-18e660f9.sandbox.novita.ai/login`
- **Login**: `/login`
- **Student Dashboard**: `/` (after login)
- **Kitchen Dashboard**: `/kitchen` (kitchen/admin role)
- **Admin Dashboard**: `/admin` (admin role only)

---

## 👤 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| **Student** | `ahmad@student.edu` | `password123` |
| **Kitchen Staff** | `kitchen@cafeteria.edu` | `password123` |
| **Admin** | `admin@cafeteria.edu` | `password123` |

---

## ✅ Completed Features & Architecture Improvements

### 🔐 Authentication & Security
- Modular `authFetch` helper in `src/lib/auth.ts` with 401 redirect handling
- Insecure password bypass removed; secure SHA-256 password verification
- JWT Token auth middleware with role enforcement (`requireAuth`, `requireRole`)

### 🧠 Demand Forecasting Engine
- Weighted moving average algorithm over historical data
- Day-of-week & time-slot demand multipliers
- Confidence score & trend detection engine (`rising` / `stable` / `falling`)
- Actionable kitchen prep recommendations

### 🍱 Student / Staff Dashboard (`/`)
- Menu browsing with stock badges (**Available** / **Running Low** / **Sold Out**)
- Responsive mobile drawer navigation with ARIA accessible controls
- Live queue length, wait estimation, and pickup slot booking
- User notification management with read-all and unread counter badges

### 👨‍🍳 Kitchen Staff Dashboard (`/kitchen`)
- Real-time dark mode order queue feed
- Status transitions (**Confirmed** → **Preparing** → **Ready** → **Completed**)
- Debounced refresh controls & live surge alert resolution

### 👑 Admin Dashboard (`/admin`)
- Overview stats with key metric badges & slot revenue breakdown
- Dynamic slot-filtered menu management and full forecast reports
- System users directory with role-based status tracking

---

## 📁 Project Structure

```
webapp/
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI workflow
├── src/
│   ├── index.tsx           # Main app & HTML dashboard views
│   ├── lib/
│   │   ├── auth.ts         # Client authentication fetch helper
│   │   └── forecast.ts     # Forecasting & queue optimization engine
│   ├── middleware/
│   │   └── auth.ts         # JWT authentication & role middleware
│   └── routes/
│       ├── auth.ts         # Authentication routes
│       ├── menu.ts         # Menu management routes
│       ├── orders.ts       # Order placement & tracking
│       ├── queue.ts        # Queue management & alerts
│       ├── forecast.ts     # Demand prediction routes
│       └── notifications.ts # Notification system
├── tests/
│   ├── auth.test.ts        # Auth unit tests
│   ├── forecast.test.ts    # Forecast engine & accuracy unit tests
│   ├── menu.test.ts        # Menu validation & clamping unit tests
│   ├── middleware.test.ts  # Middleware unit tests
│   ├── notifications.test.ts # Notifications & relative time tests
│   ├── orderState.test.ts  # Order state machine validator tests
│   ├── orders.test.ts      # Orders API unit tests
│   ├── perf.test.ts        # In-memory caching performance tests
│   └── queue.test.ts       # Queue & operating hours tests
├── wrangler.jsonc          # Cloudflare configuration
└── package.json
```

---

## 🔄 Order State Machine Workflow

Orders follow a strict, deterministic lifecycle managed by `src/lib/orderState.ts`:

```
[ pending ] ──► [ confirmed ] ──► [ preparing ] ──► [ ready ] ──► [ completed ]
     │               │                 │
     ▼               ▼                 ▼
[ cancelled ]   [ cancelled ]     [ cancelled ]
```

- **Terminal States**: `completed` and `cancelled` cannot transition to any other status.
- **Cancellation Rule**: Allowed only from `pending`, `confirmed`, and `preparing` states.
- **Inventory Protection**: If an active order is cancelled, sold stock is automatically restored to the menu inventory.

---

## 🛡️ Security & Input Validation Policies

1. **Price Integrity**: All checkout prices are verified server-side against canonical database records; client price overrides are rejected.
2. **Quantity Bounds**: Clamped to a maximum of 10 units per line item to prevent hoarding and kitchen overload.
3. **Queue Stuffing Protection**: Clamped to a maximum of 3 concurrent active uncollected orders per student account.
4. **Input Sanitization**: All order notes, user names, and menu items are sanitized to strip script tags and HTML injection vectors.
5. **Parameter Clamping**: Query limits are strictly bounded (pagination 1–50, queue status 1–100, menu prices ₹1–₹5,000, prep times 1–180 mins).

---

## 🚀 Development & Build Scripts

```bash
npm run build      # Build Vite bundle for Cloudflare Pages
npm run typecheck  # TypeScript type checking
npm run dev        # Local development server
```

---

**Deployment Status**: ✅ Production Ready (v1.2.0)  
**Last Updated**: September 2026
