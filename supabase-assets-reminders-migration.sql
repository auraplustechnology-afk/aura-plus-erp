-- ============================================================
-- AURA PLUS ERP - PAYMENT FOLLOW-UP & ASSET REGISTER MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Feature 1: Payment Reminders ─────────────────────────────

CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('whatsapp', 'call', 'email', 'in_person')),
  message_sent TEXT,
  response_received TEXT,
  next_follow_up_date DATE,
  sent_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_authenticated" ON payment_reminders 
  FOR ALL USING (auth.role() = 'authenticated');

-- ── Feature 3: Customer Assets ───────────────────────────────

CREATE TYPE asset_status AS ENUM (
  'active', 'under_warranty', 'warranty_expired', 
  'under_maintenance', 'decommissioned'
);

CREATE TABLE IF NOT EXISTS customer_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  project_id UUID REFERENCES projects(id),
  invoice_id UUID REFERENCES invoices(id),
  product_id UUID REFERENCES products(id),
  asset_name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  installation_date DATE NOT NULL,
  warranty_months INTEGER DEFAULT 12,
  warranty_expiry_date DATE,
  status asset_status DEFAULT 'active',
  location_description TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS asset_service_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES customer_assets(id) ON DELETE CASCADE,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_type TEXT NOT NULL CHECK (service_type IN (
    'installation', 'routine_maintenance', 'repair', 
    'inspection', 'replacement', 'upgrade', 'warranty_claim'
  )),
  description TEXT NOT NULL,
  technician_id UUID REFERENCES users(id),
  ticket_id UUID REFERENCES support_tickets(id),
  cost NUMERIC(15,2) DEFAULT 0,
  parts_used TEXT,
  next_service_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customer_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_service_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated" ON customer_assets 
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "allow_all_authenticated" ON asset_service_logs 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER trigger_assets_updated_at 
  BEFORE UPDATE ON customer_assets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-calculate warranty expiry when installation date or months change
CREATE OR REPLACE FUNCTION calculate_warranty_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.installation_date IS NOT NULL AND NEW.warranty_months IS NOT NULL THEN
    NEW.warranty_expiry_date := NEW.installation_date + (NEW.warranty_months || ' months')::INTERVAL;
  END IF;
  
  -- Auto-update status based on warranty
  IF NEW.warranty_expiry_date IS NOT NULL THEN
    IF NEW.warranty_expiry_date < CURRENT_DATE THEN
      NEW.status := 'warranty_expired';
    ELSE
      NEW.status := 'under_warranty';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_warranty
  BEFORE INSERT OR UPDATE ON customer_assets
  FOR EACH ROW EXECUTE FUNCTION calculate_warranty_expiry();

-- ── Verify ───────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('payment_reminders', 'customer_assets', 'asset_service_logs');
