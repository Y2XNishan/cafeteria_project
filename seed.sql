-- ================================================
-- Seed Data for Smart Cafeteria System
-- ================================================

-- Categories
INSERT OR IGNORE INTO categories (id, name, description, display_order) VALUES
  (1, 'Main Course', 'Full meals and rice dishes', 1),
  (2, 'Snacks', 'Light bites and snacks', 2),
  (3, 'Beverages', 'Hot and cold drinks', 3),
  (4, 'Desserts', 'Sweet treats', 4),
  (5, 'Breakfast', 'Morning specials', 5);

-- Menu Items
INSERT OR IGNORE INTO menu_items (id, category_id, name, description, price, preparation_time_minutes, daily_capacity) VALUES
  (1,  1, 'Nasi Lemak Set',      'Fragrant coconut rice with sambal, egg, cucumber & fried chicken', 6.50, 8,  80),
  (2,  1, 'Chicken Rice',        'Steamed chicken with aromatic rice and clear soup',                 5.50, 6,  100),
  (3,  1, 'Char Kway Teow',      'Stir-fried flat noodles with prawns, egg and bean sprouts',         6.00, 7,  60),
  (4,  1, 'Mee Goreng',          'Spicy fried noodles with tofu, egg and vegetables',                 5.00, 6,  70),
  (5,  1, 'Vegetarian Fried Rice','Fragrant fried rice with mixed vegetables and egg',               4.50, 5,  60),
  (6,  2, 'Roti Canai',          'Crispy flatbread served with dhal and curry',                       2.00, 4,  120),
  (7,  2, 'Popiah',              'Fresh spring roll with vegetables and sweet sauce',                 2.50, 3,  80),
  (8,  2, 'Curry Puff',          'Crispy pastry filled with spiced potato and chicken',               1.80, 2,  100),
  (9,  3, 'Teh Tarik',           'Frothy pulled milk tea',                                            1.80, 2,  200),
  (10, 3, 'Milo Ais',            'Iced chocolate malt drink',                                         2.00, 2,  180),
  (11, 3, 'Fresh Orange Juice',  'Freshly squeezed orange juice',                                     3.50, 3,  80),
  (12, 3, 'Mineral Water',       'Chilled mineral water',                                             1.00, 1,  300),
  (13, 4, 'Cendol',              'Shaved ice dessert with coconut milk and palm sugar',               3.00, 4,  60),
  (14, 4, 'Ais Kacang',          'Shaved ice with red beans, corn and colourful jellies',             3.50, 4,  60),
  (15, 5, 'Nasi Lemak (Breakfast)', 'Morning nasi lemak with soft-boiled egg',                       4.50, 5,  100),
  (16, 5, 'Toast & Eggs',        'Kaya toast with half-boiled eggs and coffee',                       3.50, 4,  120);

-- Users (password_hash = "password123" hashed via sha-256 placeholder)
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, student_id) VALUES
  (1,  'Admin User',      'admin@cafeteria.edu',    'hashed_admin123',   'admin',   NULL),
  (2,  'Kitchen Manager', 'kitchen@cafeteria.edu',  'hashed_kitchen123', 'kitchen', NULL),
  (3,  'Ahmad Faris',     'ahmad@student.edu',      'hashed_pass123',    'student', 'S001'),
  (4,  'Nurul Ain',       'nurul@student.edu',      'hashed_pass123',    'student', 'S002'),
  (5,  'Wei Liang',       'wei@student.edu',        'hashed_pass123',    'student', 'S003'),
  (6,  'Priya Devi',      'priya@student.edu',      'hashed_pass123',    'student', 'S004'),
  (7,  'Hafiz Rahman',    'hafiz@student.edu',      'hashed_pass123',    'student', 'S005'),
  (8,  'Mei Ling',        'mei@staff.edu',          'hashed_pass123',    'staff',   'ST001'),
  (9,  'Dr. Kumar',       'kumar@staff.edu',        'hashed_pass123',    'staff',   'ST002'),
  (10, 'Siti Nora',       'siti@student.edu',       'hashed_pass123',    'student', 'S006');

-- System Settings
INSERT OR IGNORE INTO settings (key, value, description) VALUES
  ('breakfast_start',     '07:00', 'Breakfast time slot start'),
  ('breakfast_end',       '09:30', 'Breakfast time slot end'),
  ('lunch_start',         '11:30', 'Lunch time slot start'),
  ('lunch_end',           '14:00', 'Lunch time slot end'),
  ('dinner_start',        '17:30', 'Dinner time slot start'),
  ('dinner_end',          '20:00', 'Dinner time slot end'),
  ('slot_interval_mins',  '15',    'Pickup slot interval in minutes'),
  ('max_orders_per_slot', '20',    'Max orders per pickup slot'),
  ('low_stock_threshold', '20',    'Percentage remaining to trigger low stock alert'),
  ('surge_threshold',     '150',   'Percentage of forecast to trigger surge alert');

-- Historical orders for demand forecasting (past 7 days simulation)
-- Lunch orders - Day -7
INSERT OR IGNORE INTO orders (id, user_id, order_number, status, time_slot, pickup_slot, total_amount, created_at) VALUES
  (1,  3, 'ORD-20260216-001', 'completed', 'lunch', '12:00-12:15', 8.30,  '2026-02-16 11:35:00'),
  (2,  4, 'ORD-20260216-002', 'completed', 'lunch', '12:00-12:15', 6.50,  '2026-02-16 11:40:00'),
  (3,  5, 'ORD-20260216-003', 'completed', 'lunch', '12:15-12:30', 7.50,  '2026-02-16 11:42:00'),
  (4,  6, 'ORD-20260216-004', 'completed', 'lunch', '12:15-12:30', 5.50,  '2026-02-16 11:50:00'),
  (5,  7, 'ORD-20260216-005', 'completed', 'lunch', '12:30-12:45', 9.80,  '2026-02-16 11:55:00'),
  (6,  8, 'ORD-20260217-001', 'completed', 'lunch', '12:00-12:15', 6.50,  '2026-02-17 11:38:00'),
  (7,  9, 'ORD-20260217-002', 'completed', 'lunch', '12:15-12:30', 8.00,  '2026-02-17 11:45:00'),
  (8,  3, 'ORD-20260218-001', 'completed', 'lunch', '12:00-12:15', 7.30,  '2026-02-18 11:33:00'),
  (9,  4, 'ORD-20260219-001', 'completed', 'breakfast', '08:00-08:15', 5.30, '2026-02-19 07:45:00'),
  (10, 5, 'ORD-20260219-002', 'completed', 'lunch', '12:30-12:45', 6.50,  '2026-02-19 11:58:00');

-- Order items for historical orders
INSERT OR IGNORE INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
  (1,  1, 1, 6.50, 6.50),  (1,  9, 1, 1.80, 1.80),
  (2,  1, 1, 6.50, 6.50),
  (3,  2, 1, 5.50, 5.50),  (3,  9, 1, 1.80, 1.80),
  (4,  2, 1, 5.50, 5.50),
  (5,  3, 1, 6.00, 6.00),  (5,  13, 1, 3.00, 3.00), (5,  12, 1, 1.00, 1.00),
  (6,  1, 1, 6.50, 6.50),
  (7,  4, 1, 5.00, 5.00),  (7,  10, 1, 2.00, 2.00),
  (8,  5, 1, 4.50, 4.50),  (8,  9, 1, 1.80, 1.80),
  (9,  15,1, 4.50, 4.50),  (9,  9, 1, 1.80, 1.80),
  (10, 2, 1, 5.50, 5.50);

-- Today's menu availability
INSERT OR IGNORE INTO menu_availability (menu_item_id, date, time_slot, quantity_prepared, quantity_sold, quantity_remaining, status) VALUES
  (1,  '2026-02-23', 'breakfast', 40,  28, 12, 'available'),
  (15, '2026-02-23', 'breakfast', 60,  35, 25, 'available'),
  (16, '2026-02-23', 'breakfast', 50,  30, 20, 'available'),
  (6,  '2026-02-23', 'breakfast', 80,  55, 25, 'available'),
  (9,  '2026-02-23', 'breakfast', 120, 70, 50, 'available'),
  (10, '2026-02-23', 'breakfast', 100, 60, 40, 'available'),
  (1,  '2026-02-23', 'lunch',     80,  52, 28, 'available'),
  (2,  '2026-02-23', 'lunch',     100, 68, 32, 'available'),
  (3,  '2026-02-23', 'lunch',     60,  47, 13, 'running_low'),
  (4,  '2026-02-23', 'lunch',     70,  55, 15, 'running_low'),
  (5,  '2026-02-23', 'lunch',     60,  18, 42, 'available'),
  (6,  '2026-02-23', 'lunch',     100, 80, 20, 'running_low'),
  (7,  '2026-02-23', 'lunch',     80,  80,  0, 'sold_out'),
  (8,  '2026-02-23', 'lunch',     100, 65, 35, 'available'),
  (9,  '2026-02-23', 'lunch',     180, 110, 70, 'available'),
  (10, '2026-02-23', 'lunch',     160, 98, 62, 'available'),
  (11, '2026-02-23', 'lunch',     60,  20, 40, 'available'),
  (12, '2026-02-23', 'lunch',     250, 130, 120, 'available'),
  (13, '2026-02-23', 'lunch',     60,  45, 15, 'running_low'),
  (14, '2026-02-23', 'lunch',     60,  22, 38, 'available');

-- Demand Forecasts for today
INSERT OR IGNORE INTO demand_forecasts (menu_item_id, forecast_date, time_slot, predicted_quantity, confidence_score, actual_quantity) VALUES
  (1,  '2026-02-23', 'lunch', 75,  0.87, 52),
  (2,  '2026-02-23', 'lunch', 95,  0.91, 68),
  (3,  '2026-02-23', 'lunch', 55,  0.83, 47),
  (4,  '2026-02-23', 'lunch', 65,  0.85, 55),
  (5,  '2026-02-23', 'lunch', 50,  0.78, 18),
  (6,  '2026-02-23', 'lunch', 90,  0.89, 80),
  (7,  '2026-02-23', 'lunch', 70,  0.82, 80),
  (8,  '2026-02-23', 'lunch', 85,  0.86, 65),
  (9,  '2026-02-23', 'lunch', 160, 0.93, 110),
  (10, '2026-02-23', 'lunch', 150, 0.92, 98),
  (1,  '2026-02-23', 'breakfast', 35, 0.81, 28),
  (15, '2026-02-23', 'breakfast', 55, 0.84, 35),
  (9,  '2026-02-23', 'breakfast', 110, 0.90, 70);

-- Active queue entries (today's lunch queue)
INSERT OR IGNORE INTO orders (id, user_id, order_number, status, time_slot, pickup_slot, estimated_wait_minutes, total_amount, created_at) VALUES
  (11, 3,  'ORD-20260223-001', 'preparing', 'lunch', '12:30-12:45', 8,  8.30,  '2026-02-23 12:05:00'),
  (12, 4,  'ORD-20260223-002', 'preparing', 'lunch', '12:30-12:45', 10, 6.50,  '2026-02-23 12:07:00'),
  (13, 5,  'ORD-20260223-003', 'ready',     'lunch', '12:15-12:30', 0,  7.50,  '2026-02-23 11:55:00'),
  (14, 6,  'ORD-20260223-004', 'confirmed', 'lunch', '12:45-13:00', 15, 5.50,  '2026-02-23 12:10:00'),
  (15, 7,  'ORD-20260223-005', 'confirmed', 'lunch', '12:45-13:00', 18, 9.80,  '2026-02-23 12:12:00'),
  (16, 8,  'ORD-20260223-006', 'pending',   'lunch', '13:00-13:15', 22, 6.50,  '2026-02-23 12:15:00'),
  (17, 10, 'ORD-20260223-007', 'pending',   'lunch', '13:00-13:15', 25, 4.50,  '2026-02-23 12:17:00');

INSERT OR IGNORE INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
  (11, 1, 1, 6.50, 6.50), (11, 9, 1, 1.80, 1.80),
  (12, 1, 1, 6.50, 6.50),
  (13, 2, 1, 5.50, 5.50), (13, 9, 1, 1.80, 1.80),
  (14, 2, 1, 5.50, 5.50),
  (15, 3, 1, 6.00, 6.00), (15, 13, 1, 3.00, 3.00), (15, 12, 1, 1.00, 1.00),
  (16, 1, 1, 6.50, 6.50),
  (17, 5, 1, 4.50, 4.50);

-- Queue entries for today
INSERT OR IGNORE INTO queue_entries (order_id, queue_position, time_slot, date, pickup_slot, status, entered_at, estimated_ready_at) VALUES
  (11, 1, 'lunch', '2026-02-23', '12:30-12:45', 'processing', '2026-02-23 12:05:00', '2026-02-23 12:13:00'),
  (12, 2, 'lunch', '2026-02-23', '12:30-12:45', 'processing', '2026-02-23 12:07:00', '2026-02-23 12:17:00'),
  (13, 3, 'lunch', '2026-02-23', '12:15-12:30', 'ready',      '2026-02-23 11:55:00', '2026-02-23 12:03:00'),
  (14, 4, 'lunch', '2026-02-23', '12:45-13:00', 'waiting',    '2026-02-23 12:10:00', '2026-02-23 12:25:00'),
  (15, 5, 'lunch', '2026-02-23', '12:45-13:00', 'waiting',    '2026-02-23 12:12:00', '2026-02-23 12:30:00'),
  (16, 6, 'lunch', '2026-02-23', '13:00-13:15', 'waiting',    '2026-02-23 12:15:00', '2026-02-23 12:37:00'),
  (17, 7, 'lunch', '2026-02-23', '13:00-13:15', 'waiting',    '2026-02-23 12:17:00', '2026-02-23 12:42:00');

-- Surge alert example
INSERT OR IGNORE INTO surge_alerts (id, time_slot, date, menu_item_id, alert_type, message, is_resolved) VALUES
  (1, 'lunch', '2026-02-23', 7, 'low_stock',     'Popiah is sold out. Consider preparing extra for dinner.', 0),
  (2, 'lunch', '2026-02-23', 3, 'demand_surge',  'Char Kway Teow demand exceeded forecast by 47%. Running low.', 0),
  (3, 'lunch', '2026-02-23', NULL, 'high_queue', 'Queue length at 7 orders. Estimated max wait: 25 minutes.', 0);

-- Notifications
INSERT OR IGNORE INTO notifications (user_id, order_id, type, title, message) VALUES
  (5, 13, 'order_ready',   'Order Ready!',         'Your order ORD-20260223-003 is ready for pickup at slot 12:15-12:30.'),
  (3, 11, 'order_delayed', 'Order Delayed Slightly','Your order ORD-20260223-001 prep is in progress. New pickup: 12:30-12:45.'),
  (7, 15, 'order_ready',   'Order Confirmed',       'Your order ORD-20260223-005 is confirmed. Pickup slot: 12:45-13:00.');
