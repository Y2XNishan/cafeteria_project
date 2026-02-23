# 🍽️ SmartCafé – Smart Demand Forecast & Queue Optimization System

## Project Overview
- **Name**: SmartCafé
- **Goal**: Reduce cafeteria food waste and waiting time through predictive analytics and intelligent queue management
- **Stack**: Hono + TypeScript + Cloudflare Pages + D1 SQLite + TailwindCSS + Chart.js

---

## 🌐 URLs
- **Live App**: `https://3000-<sandbox>.sandbox.novita.ai`
- **Login**: `/login`
- **Student Dashboard**: `/` (after login)
- **Kitchen Dashboard**: `/kitchen` (kitchen/admin role)
- **Admin Dashboard**: `/admin` (admin role only)

---

## 👤 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| **Student** | `ahmad@student.edu` | *(any password)* |
| **Kitchen Staff** | `kitchen@cafeteria.edu` | *(any password)* |
| **Admin** | `admin@cafeteria.edu` | *(any password)* |

---

## ✅ Completed Features

### 🧠 Demand Forecasting Engine
- Weighted moving average algorithm over 14-day historical data
- Day-of-week multipliers (peak/off-peak adjustments)
- Time-slot multipliers (breakfast / lunch / dinner weighting)
- Confidence score calculation (based on variance coefficient)
- Trend detection (rising / stable / falling)
- AI-generated preparation recommendations

### 🍱 Student / Staff Dashboard (`/`)
- Browse menu with **Available / Running Low / Sold Out** badges
- Time slot switching (Breakfast / Lunch / Dinner)
- Add items to cart with quantity controls
- **Place orders** with automatic queue assignment and pickup slot allocation
- Live queue banner (queue length, estimated wait, next available slot)
- Queue status page with live entries and slot grid
- My Orders history with status tracking
- Notifications with unread count badge

### 👨‍🍳 Kitchen Staff Dashboard (`/kitchen`)
- Real-time order queue display (dark theme)
- Order status workflow: **Confirmed → Preparing → Ready → Completed**
- Live demand forecast bars per item with trend indicators
- Stock status panel with visual progress bars
- Active surge alerts (Low Stock / Demand Surge / High Queue)
- Alert resolution system
- Auto-refresh every 15 seconds + live clock

### 👑 Admin Dashboard (`/admin`)
- Overview stats: Total Orders, Revenue, Avg Wait, Active Orders
- Orders by time slot bar chart
- Top 5 menu items chart
- AI Demand Forecast table with accuracy tracking
- Full orders table with filters
- Menu management (add / activate / deactivate items)
- Weekly analytics (sales by item, doughnut chart, demand table)
- Full forecast report with recommendations
- User management table

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/users` | All users (admin) |
| GET | `/api/menu?slot=` | Menu with availability |
| POST | `/api/menu` | Add menu item |
| PATCH | `/api/menu/:id/toggle` | Activate/deactivate item |
| PUT | `/api/menu/:id/availability` | Update stock |
| POST | `/api/orders` | Place order |
| GET | `/api/orders/user/:id` | User's order history |
| GET | `/api/orders/active/all?slot=` | Active orders |
| GET | `/api/orders/stats/today` | Today's statistics |
| PATCH | `/api/orders/:id/status` | Update order status |
| GET | `/api/queue/status?slot=` | Queue status + slots |
| GET | `/api/queue/alerts` | Surge alerts |
| PATCH | `/api/queue/alerts/:id/resolve` | Resolve alert |
| GET | `/api/queue/live` | Live queue summary |
| GET | `/api/forecast/predict?slot=` | Generate AI forecast |
| GET | `/api/forecast/stored?slot=` | Stored forecasts |
| GET | `/api/forecast/weekly` | Weekly demand |
| GET | `/api/forecast/top-items` | Top items |
| GET | `/api/notifications/user/:id` | User notifications |
| PATCH | `/api/notifications/:id/read` | Mark read |

---

## 🗄️ Data Architecture

### Database: Cloudflare D1 (SQLite)
| Table | Purpose |
|-------|---------|
| `users` | Students, staff, kitchen, admin accounts |
| `categories` | Menu categories (Main, Snacks, Beverages, etc.) |
| `menu_items` | Menu items with pricing and capacity |
| `menu_availability` | Daily stock per item/slot with status |
| `orders` | Order records with queue assignment |
| `order_items` | Per-item quantities in each order |
| `demand_forecasts` | Predicted vs actual demand records |
| `queue_entries` | Live queue positions and pickup slots |
| `notifications` | User notification history |
| `surge_alerts` | Kitchen surge/low-stock alerts |
| `settings` | System configuration key-values |

---

## 🧮 Forecasting Algorithm

```
predicted = WMA(historical_counts) × day_multiplier × slot_multiplier
confidence = 1 - (std_dev / mean) × 0.5
trend = compare(recent_3_days_avg, older_days_avg)
```

- **Day multipliers**: Mon-Thu (1.1–1.2), Sat-Sun (0.5–0.6)
- **Slot multipliers**: Lunch (1.0), Dinner (0.8), Breakfast (0.7)
- **Low stock threshold**: ≤ 20% remaining triggers "Running Low"

---

## 📁 Project Structure

```
webapp/
├── src/
│   ├── index.tsx           # Main app + all HTML dashboards
│   ├── lib/
│   │   └── forecast.ts     # Forecasting & queue optimization engine
│   └── routes/
│       ├── auth.ts         # Authentication routes
│       ├── menu.ts         # Menu management routes
│       ├── orders.ts       # Order placement & tracking
│       ├── queue.ts        # Queue management & alerts
│       ├── forecast.ts     # Demand prediction routes
│       └── notifications.ts # Notification system
├── migrations/
│   └── 0001_initial_schema.sql  # Full DB schema
├── seed.sql                # Demo data (menu, users, orders)
├── ecosystem.config.cjs    # PM2 startup config
├── wrangler.jsonc          # Cloudflare configuration
└── package.json
```

---

## 🚀 Deployment

### Local Development (Sandbox)
```bash
npm run build
pm2 start ecosystem.config.cjs
# OR
npm run db:reset    # Reset & reseed database
```

### Cloudflare Pages Production
```bash
# Create D1 database first
npx wrangler d1 create cafeteria-production
# Update database_id in wrangler.jsonc, then:
npm run build
npx wrangler d1 migrations apply cafeteria-production
npx wrangler pages deploy dist --project-name smartcafe
```

---

## 🔮 Future Enhancements (from SRS)
- [ ] AI-based personalized meal suggestions
- [ ] Inventory automation integration
- [ ] Mobile app (React Native / PWA)
- [ ] Advanced ML forecasting (LSTM model)
- [ ] Email/SMS notifications
- [ ] Payment gateway integration
- [ ] Multi-cafeteria support

---

**Deployment Status**: ✅ Active (Sandbox)  
**Last Updated**: 2026-02-23
