-- ================================================
-- Smart Demand Forecast & Queue Optimization System
-- Initial Database Schema
-- ================================================

-- Users table (students, staff, kitchen staff, admins)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student', -- 'student', 'staff', 'kitchen', 'admin'
  student_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Menu categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

-- Menu items
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  preparation_time_minutes INTEGER DEFAULT 5,
  image_url TEXT,
  is_active INTEGER DEFAULT 1,
  daily_capacity INTEGER DEFAULT 50,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Daily menu availability (tracks stock per day and time slot)
CREATE TABLE IF NOT EXISTS menu_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_item_id INTEGER NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  time_slot TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner'
  quantity_prepared INTEGER DEFAULT 0,
  quantity_sold INTEGER DEFAULT 0,
  quantity_remaining INTEGER DEFAULT 0,
  status TEXT DEFAULT 'available', -- 'available', 'running_low', 'sold_out'
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
  UNIQUE(menu_item_id, date, time_slot)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'
  time_slot TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner'
  pickup_slot TEXT, -- Assigned time window e.g. '12:00-12:15'
  pickup_time DATETIME,
  estimated_wait_minutes INTEGER DEFAULT 0,
  actual_wait_minutes INTEGER,
  total_amount REAL DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  menu_item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- Demand forecasts (computed predictions per time slot)
CREATE TABLE IF NOT EXISTS demand_forecasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_item_id INTEGER NOT NULL,
  forecast_date TEXT NOT NULL, -- YYYY-MM-DD
  time_slot TEXT NOT NULL,
  predicted_quantity INTEGER NOT NULL,
  confidence_score REAL DEFAULT 0.8,
  actual_quantity INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
  UNIQUE(menu_item_id, forecast_date, time_slot)
);

-- Queue tracking
CREATE TABLE IF NOT EXISTS queue_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL UNIQUE,
  queue_position INTEGER NOT NULL,
  time_slot TEXT NOT NULL,
  date TEXT NOT NULL,
  entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  estimated_ready_at DATETIME,
  actual_ready_at DATETIME,
  pickup_slot TEXT,
  status TEXT DEFAULT 'waiting', -- 'waiting', 'processing', 'ready', 'collected'
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  order_id INTEGER,
  type TEXT NOT NULL, -- 'order_ready', 'order_delayed', 'low_stock', 'surge_alert'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Surge alerts for kitchen staff
CREATE TABLE IF NOT EXISTS surge_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  time_slot TEXT NOT NULL,
  date TEXT NOT NULL,
  menu_item_id INTEGER,
  alert_type TEXT NOT NULL, -- 'demand_surge', 'low_stock', 'high_queue'
  message TEXT NOT NULL,
  is_resolved INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- System settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_time_slot ON orders(time_slot);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_slot ON orders(created_at, time_slot, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_availability_date ON menu_availability(date);
CREATE INDEX IF NOT EXISTS idx_menu_availability_lookup ON menu_availability(menu_item_id, date, time_slot);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_date ON demand_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_lookup ON demand_forecasts(menu_item_id, forecast_date, time_slot);
CREATE INDEX IF NOT EXISTS idx_queue_entries_date ON queue_entries(date);
CREATE INDEX IF NOT EXISTS idx_queue_entries_slot_status ON queue_entries(date, time_slot, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_surge_alerts_date_status ON surge_alerts(date, is_resolved);
