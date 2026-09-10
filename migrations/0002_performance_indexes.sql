-- ================================================
-- Performance Optimization Indexes
-- ================================================

-- Speed up menu loading by active status and category
CREATE INDEX IF NOT EXISTS idx_menu_items_active_cat ON menu_items(is_active, category_id);

-- Speed up stock status filtering in kitchen and student views
CREATE INDEX IF NOT EXISTS idx_menu_availability_status ON menu_availability(date, time_slot, status);

-- Speed up queue position computation and active order filtering
CREATE INDEX IF NOT EXISTS idx_orders_active_queue ON orders(time_slot, status, created_at);

-- Speed up low stock surge alert checks during order placement
CREATE INDEX IF NOT EXISTS idx_surge_alerts_lookup ON surge_alerts(menu_item_id, time_slot, date, alert_type, is_resolved);
