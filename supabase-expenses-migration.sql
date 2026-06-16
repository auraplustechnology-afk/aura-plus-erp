-- ============================================================
-- AURA PLUS ERP - EXPENSES & IMPROVEMENTS MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#64748B',
  icon TEXT DEFAULT '💰',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert default categories
INSERT INTO expense_categories (name, color, icon) VALUES
  ('Transport',   '#3B82F6', '🚗'),
  ('Fuel',        '#F59E0B', '⛽'),
  ('Food',        '#10B981', '🍽️'),
  ('Airtime',     '#8B5CF6', '📱'),
  ('Internet',    '#06B6D4', '🌐'),
  ('Salaries',    '#EF4444', '👥'),
  ('Rent',        '#F97316', '🏢'),
  ('Utilities',   '#84CC16', '💡'),
  ('Maintenance', '#6B7280', '🔧'),
  ('Marketing',   '#EC4899', '📣'),
  ('Other',       '#94A3B8', '📦')
ON CONFLICT (name) DO NOTHING;

-- 3. Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL,
  category_id UUID REFERENCES expense_categories(id),
  description TEXT NOT NULL,
  employee_id UUID REFERENCES users(id),
  receipt_url TEXT,
  receipt_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 4. Enable RLS on expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated" ON expenses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_all_authenticated" ON expense_categories FOR ALL USING (auth.role() = 'authenticated');

-- 5. Add trigger for updated_at
CREATE TRIGGER trigger_expenses_updated_at 
  BEFORE UPDATE ON expenses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Add lead_source_detail to leads table for specific source tracking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_source_detail TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_inbound BOOLEAN DEFAULT TRUE;

-- 7. Add currency setting
INSERT INTO system_settings (key, value) VALUES
  ('currency_code',   '"ZMW"'),
  ('currency_symbol', '"ZMW"'),
  ('currency_locale', '"en-ZM"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================
-- VERIFY
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('expenses', 'expense_categories');
-- ============================================================
