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
│   ├── forecast.test.ts    # Forecast engine unit tests
│   └── middleware.test.ts  # Middleware unit tests
├── wrangler.jsonc          # Cloudflare configuration
└── package.json
```

---

## 🚀 Development & Build Scripts

```bash
npm run build      # Build Vite bundle for Cloudflare Pages
npm run typecheck  # TypeScript type checking
npm run dev        # Local development server
```

---

**Deployment Status**: ✅ Active  
**Last Updated**: September 2026
