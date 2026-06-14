-- ============================================================
-- AURA PLUS ERP - SECURITY UPGRADE MIGRATION
-- Run this in Supabase SQL Editor AFTER the main schema
-- ============================================================

-- 1. Add department field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;

-- 2. Add password_reset_at tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_at TIMESTAMPTZ;

-- 3. Add setup_completed flag for first-login wizard
ALTER TABLE users ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

-- 4. Add system_settings entries for setup wizard
INSERT INTO system_settings (key, value) VALUES
  ('setup_completed', 'false'),
  ('quote_prefix', '"AQP"'),
  ('quote_next_number', '1'),
  ('invoice_prefix', '"INV"'),
  ('invoice_next_number', '1'),
  ('project_prefix', '"PRJ"'),
  ('ticket_prefix', '"TKT"'),
  ('contract_prefix', '"MCT"'),
  ('session_timeout_minutes', '60'),
  ('password_min_length', '8')
ON CONFLICT (key) DO NOTHING;

-- 5. Enhanced activity log view with full details
CREATE OR REPLACE VIEW v_activity_log_full AS
SELECT
  al.id,
  al.created_at,
  al.action,
  al.entity_type AS module,
  al.entity_id,
  al.entity_label,
  al.old_values,
  al.new_values,
  al.ip_address,
  u.full_name AS user_name,
  u.email AS user_email,
  u.role AS user_role,
  u.department AS user_department
FROM activity_logs al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC;

-- 6. RLS policy for the new view
-- (Views inherit RLS from underlying tables)

-- 7. Function to log with full context
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_entity_label TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO activity_logs (
    user_id, action, entity_type, entity_id,
    entity_label, old_values, new_values, ip_address
  ) VALUES (
    p_user_id, p_action::activity_action, p_entity_type::activity_entity,
    p_entity_id, p_entity_label, p_old_values, p_new_values, p_ip_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update activity_action enum to include new actions
-- (PostgreSQL requires this approach to add enum values)
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'password_reset';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'deactivated';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'activated';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'setup_completed';

-- 9. Update activity_entity enum to include user
ALTER TYPE activity_entity ADD VALUE IF NOT EXISTS 'settings';

-- ============================================================
-- VERIFY: Run this to confirm migration succeeded
-- ============================================================
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'department';
