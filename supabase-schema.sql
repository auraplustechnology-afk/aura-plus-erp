-- ============================================================
-- AURA PLUS ERP - COMPLETE DATABASE SCHEMA
-- ============================================================
-- Run this in your Supabase SQL Editor in order.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SEQUENCES (document number generation)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS project_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1;

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('super_admin', 'sales', 'technician', 'accountant', 'manager');
CREATE TYPE customer_type AS ENUM ('prospect', 'active', 'inactive');
CREATE TYPE customer_source AS ENUM ('lead_conversion', 'manual', 'walk_in', 'referral', 'online');
CREATE TYPE lead_stage AS ENUM ('new_lead', 'contacted', 'follow_up', 'quote_sent', 'won', 'lost', 'ghosted');
CREATE TYPE lead_source AS ENUM ('facebook', 'referral', 'walk_in', 'phone_call', 'email', 'website', 'other');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
CREATE TYPE line_type AS ENUM ('product', 'service', 'labour', 'installation');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'partially_paid', 'overdue');
CREATE TYPE invoice_type AS ENUM ('standard', 'proforma');
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'mobile_money', 'cheque');
CREATE TYPE project_status AS ENUM ('pending', 'scheduled', 'in_progress', 'completed');
CREATE TYPE technician_role AS ENUM ('lead', 'assistant');
CREATE TYPE ticket_status AS ENUM ('open', 'assigned', 'in_progress', 'waiting_for_client', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE contract_status AS ENUM ('active', 'expired', 'cancelled', 'pending_renewal');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'quarterly', 'annually');
CREATE TYPE stock_adjustment_type AS ENUM ('in', 'out', 'correction', 'sale', 'write_off', 'project_use');
CREATE TYPE stock_reference_type AS ENUM ('invoice', 'project', 'manual');
CREATE TYPE activity_action AS ENUM ('created', 'updated', 'deleted', 'status_changed', 'payment_recorded', 'stock_adjusted', 'login', 'logout', 'converted');
CREATE TYPE activity_entity AS ENUM ('lead', 'customer', 'quotation', 'invoice', 'payment', 'product', 'project', 'ticket', 'contract', 'user', 'stock_adjustment');
CREATE TYPE deduction_via AS ENUM ('invoice', 'project', 'manual');

-- ============================================================
-- TABLE: system_settings
-- ============================================================
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default system settings
INSERT INTO system_settings (key, value) VALUES
  ('company_name', '"Aura Plus Technologies"'),
  ('company_address', '"Located on Chilumbulu Road, Plot Number 10011, Kamwala, Lusaka"'),
  ('company_phone', '"+260 97 4018157"'),
  ('company_email', '"auraplustechnology@gmail.com"'),
  ('company_website', '"www.auraplustechnologies.com"'),
  ('company_tpin', '"1012756257"'),
  ('company_logo_url', 'null'),
  ('bank_name', '"ABSA BANK ZAMBIA PLC"'),
  ('bank_account_name', '"AURA PLUS TECHNOLOGIES"'),
  ('bank_account_number', '"2286625"'),
  ('bank_branch', '"LUSAKA BUSINESS CENTER"'),
  ('bank_branch_number', '"016"'),
  ('bank_sort_code', '"020016"'),
  ('default_terms', '"Account Name - AURA PLUS TECHNOLOGIES\nAccount Number - 2286625\nBranch Number - 016\nBranch Name - LUSAKA BUSINESS CENTER\nSort Code - 020016\nBank Name - ABSA BANK ZAMBIA PLC"'),
  ('default_notes', '"Looking forward to doing business with you."'),
  ('quote_validity_days', '30'),
  ('invoice_due_days', '30'),
  ('currency_symbol', '"ZMW"'),
  ('dark_mode_default', 'false');

-- ============================================================
-- TABLE: users (extends Supabase auth.users)
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'sales',
  is_active BOOLEAN DEFAULT TRUE,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- ============================================================
-- TABLE: customers
-- ============================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  physical_address TEXT,
  customer_type customer_type DEFAULT 'prospect',
  source customer_source DEFAULT 'manual',
  tpin TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ  -- soft delete
);

-- ============================================================
-- TABLE: leads
-- ============================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),  -- set after conversion
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  physical_address TEXT,
  lead_source lead_source DEFAULT 'other',
  assigned_to UUID REFERENCES users(id),
  expected_value NUMERIC(15,2) DEFAULT 0,
  stage lead_stage DEFAULT 'new_lead',
  notes TEXT,
  converted_to_customer_id UUID REFERENCES customers(id),
  converted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- TABLE: quotations
-- ============================================================
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number TEXT UNIQUE NOT NULL,  -- AQP-YYYY-00001
  customer_id UUID NOT NULL REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  created_by UUID REFERENCES users(id),
  assigned_salesperson UUID REFERENCES users(id),
  status quote_status DEFAULT 'draft',
  version_number INTEGER DEFAULT 1,
  parent_quote_id UUID REFERENCES quotations(id),  -- for revisions
  subtotal NUMERIC(15,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  tot_note TEXT DEFAULT 'Subject to TOT',
  terms_and_conditions TEXT,
  notes TEXT,
  valid_until DATE,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- TABLE: quotation_lines
-- ============================================================
CREATE TABLE quotation_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  line_type line_type NOT NULL DEFAULT 'product',
  product_id UUID,  -- nullable for manual lines
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(15,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(15,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: invoices
-- ============================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,  -- INV-YYYY-00001
  invoice_type invoice_type DEFAULT 'standard',
  quotation_id UUID REFERENCES quotations(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  created_by UUID REFERENCES users(id),
  status invoice_status DEFAULT 'draft',
  subtotal NUMERIC(15,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  amount_paid NUMERIC(15,2) DEFAULT 0,
  outstanding_balance NUMERIC(15,2) DEFAULT 0,
  tot_note TEXT DEFAULT 'Subject to TOT',
  terms_and_conditions TEXT,
  notes TEXT,
  payment_terms TEXT DEFAULT 'Due on Receipt',
  due_date DATE,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  stock_deducted BOOLEAN DEFAULT FALSE,
  stock_deducted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- TABLE: invoice_lines
-- ============================================================
CREATE TABLE invoice_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_type line_type NOT NULL DEFAULT 'product',
  product_id UUID,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(15,2) DEFAULT 0,
  line_total NUMERIC(15,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: payments
-- ============================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  payment_method payment_method DEFAULT 'bank_transfer',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: product_categories
-- ============================================================
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES product_categories(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default categories for Aura Plus
INSERT INTO product_categories (name, description) VALUES
  ('Time Attendance Systems', 'Fingerprint, facial recognition and card attendance devices'),
  ('Access Control', 'Door access control systems and readers'),
  ('CCTV', 'Security cameras and DVR/NVR systems'),
  ('Smart Home', 'Home automation and smart devices'),
  ('Networking', 'Routers, switches, and networking equipment'),
  ('Electrical', 'Electrical installation materials and supplies'),
  ('Accessories', 'Cables, brackets, and miscellaneous accessories'),
  ('Services', 'Labour, installation, and maintenance services');

-- ============================================================
-- TABLE: suppliers
-- ============================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: products
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  category_id UUID REFERENCES product_categories(id),
  supplier_id UUID REFERENCES suppliers(id),
  cost_price NUMERIC(15,2) DEFAULT 0,
  selling_price NUMERIC(15,2) DEFAULT 0,
  quantity_in_stock NUMERIC(10,2) DEFAULT 0,
  reorder_level NUMERIC(10,2) DEFAULT 5,
  unit_of_measure TEXT DEFAULT 'unit',
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: stock_adjustments
-- ============================================================
CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  adjustment_type stock_adjustment_type NOT NULL,
  quantity_before NUMERIC(10,2) NOT NULL,
  quantity_change NUMERIC(10,2) NOT NULL,
  quantity_after NUMERIC(10,2) NOT NULL,
  reference_type stock_reference_type,
  reference_id UUID,  -- invoice_id or project_id
  reason TEXT,
  adjusted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: projects
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_number TEXT UNIQUE NOT NULL,  -- PRJ-YYYY-00001
  customer_id UUID NOT NULL REFERENCES customers(id),
  quotation_id UUID REFERENCES quotations(id),
  invoice_id UUID REFERENCES invoices(id),
  project_name TEXT NOT NULL,
  scheduled_date DATE,
  status project_status DEFAULT 'pending',
  notes TEXT,
  checklist JSONB DEFAULT '{
    "equipment_installed": false,
    "equipment_tested": false,
    "client_trained": false,
    "photos_uploaded": false,
    "client_sign_off": false
  }'::jsonb,
  stock_deducted_via deduction_via,
  stock_deducted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- TABLE: project_technicians (multi-technician support)
-- ============================================================
CREATE TABLE project_technicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES users(id),
  role technician_role DEFAULT 'assistant',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(project_id, technician_id)
);

-- ============================================================
-- TABLE: project_products (products used in project)
-- ============================================================
CREATE TABLE project_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity_used NUMERIC(10,2) DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, product_id)
);

-- ============================================================
-- TABLE: project_files
-- ============================================================
CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('before', 'after', 'document')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: support_tickets
-- ============================================================
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL,  -- TKT-YYYY-00001
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_id UUID REFERENCES products(id),
  project_id UUID REFERENCES projects(id),
  issue_description TEXT NOT NULL,
  priority ticket_priority DEFAULT 'medium',
  assigned_technician_id UUID REFERENCES users(id),
  status ticket_status DEFAULT 'open',
  resolution_notes TEXT,
  sla_due_at TIMESTAMPTZ,  -- auto-set based on priority
  escalated_to_project_id UUID REFERENCES projects(id),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- TABLE: ticket_comments
-- ============================================================
CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,  -- internal notes vs client-visible
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: maintenance_contracts
-- ============================================================
CREATE TABLE maintenance_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_number TEXT UNIQUE NOT NULL,  -- MCT-YYYY-00001
  customer_id UUID NOT NULL REFERENCES customers(id),
  contract_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_date DATE,
  value NUMERIC(15,2) DEFAULT 0,
  billing_cycle billing_cycle DEFAULT 'monthly',
  status contract_status DEFAULT 'active',
  products_covered JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- TABLE: contract_invoices
-- ============================================================
CREATE TABLE contract_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES maintenance_contracts(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: activity_logs (append-only audit trail)
-- ============================================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action activity_action NOT NULL,
  entity_type activity_entity NOT NULL,
  entity_id UUID,
  entity_label TEXT,  -- human-readable: "INV-2026-00001"
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create initial partitions (by year-month)
CREATE TABLE activity_logs_2026_01 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE activity_logs_2026_02 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE activity_logs_2026_03 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE activity_logs_2026_04 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE activity_logs_2026_05 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE activity_logs_2026_06 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE activity_logs_2026_07 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE activity_logs_2026_08 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE activity_logs_2026_09 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE activity_logs_2026_10 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE activity_logs_2026_11 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE activity_logs_2026_12 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE activity_logs_2027 PARTITION OF activity_logs
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- ============================================================
-- INDEXES (performance)
-- ============================================================
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_customers_company_name ON customers(company_name);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_created_at ON quotations(created_at DESC);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_stock_adjustments_product_id ON stock_adjustments(product_id);
CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_technicians_technician_id ON project_technicians(technician_id);
CREATE INDEX idx_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_assigned_technician ON support_tickets(assigned_technician_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================================
-- FUNCTIONS: Document Number Generation
-- ============================================================
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  seq_num TEXT := LPAD(nextval('quotation_number_seq')::TEXT, 5, '0');
BEGIN
  RETURN 'AQP-' || year_str || '-' || seq_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  seq_num TEXT := LPAD(nextval('invoice_number_seq')::TEXT, 5, '0');
BEGIN
  RETURN 'INV-' || year_str || '-' || seq_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  seq_num TEXT := LPAD(nextval('project_number_seq')::TEXT, 5, '0');
BEGIN
  RETURN 'PRJ-' || year_str || '-' || seq_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  seq_num TEXT := LPAD(nextval('ticket_number_seq')::TEXT, 5, '0');
BEGIN
  RETURN 'TKT-' || year_str || '-' || seq_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  seq_num TEXT := LPAD(nextval('contract_number_seq')::TEXT, 5, '0');
BEGIN
  RETURN 'MCT-' || year_str || '-' || seq_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Auto-calculate invoice balance
-- ============================================================
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET
    amount_paid = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id),
    outstanding_balance = total - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id),
    status = CASE
      WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id) >= total THEN 'paid'::invoice_status
      WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id) > 0 THEN 'partially_paid'::invoice_status
      ELSE status
    END,
    paid_at = CASE
      WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id) >= total THEN NOW()
      ELSE paid_at
    END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_balance
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_balance();

-- ============================================================
-- FUNCTION: Auto-set SLA due date on ticket creation
-- ============================================================
CREATE OR REPLACE FUNCTION set_ticket_sla()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sla_due_at := CASE NEW.priority
    WHEN 'critical' THEN NOW() + INTERVAL '4 hours'
    WHEN 'high'     THEN NOW() + INTERVAL '24 hours'
    WHEN 'medium'   THEN NOW() + INTERVAL '72 hours'
    WHEN 'low'      THEN NOW() + INTERVAL '7 days'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_sla
  BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_ticket_sla();

-- ============================================================
-- FUNCTION: Auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_contracts_updated_at BEFORE UPDATE ON maintenance_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- MANAGER REPORT VIEWS
-- ============================================================

-- View: Sales Report
CREATE OR REPLACE VIEW v_sales_report AS
SELECT
  i.id,
  i.invoice_number,
  i.customer_id,
  c.company_name AS customer_name,
  i.total,
  i.amount_paid,
  i.status,
  i.created_at,
  i.paid_at,
  u.full_name AS created_by_name,
  DATE_TRUNC('month', i.created_at) AS month,
  DATE_TRUNC('year', i.created_at) AS year
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
LEFT JOIN users u ON i.created_by = u.id
WHERE i.deleted_at IS NULL;

-- View: Problem Products Report
CREATE OR REPLACE VIEW v_problem_products AS
SELECT
  p.id AS product_id,
  p.sku,
  p.product_name,
  pc.name AS category_name,
  COUNT(st.id) AS total_tickets,
  COUNT(CASE WHEN st.status IN ('open', 'assigned', 'in_progress') THEN 1 END) AS open_tickets,
  COUNT(CASE WHEN st.status IN ('resolved', 'closed') THEN 1 END) AS resolved_tickets,
  AVG(EXTRACT(EPOCH FROM (st.resolved_at - st.created_at))/3600)::NUMERIC(10,2) AS avg_resolution_hours
FROM products p
LEFT JOIN support_tickets st ON st.product_id = p.id AND st.deleted_at IS NULL
LEFT JOIN product_categories pc ON p.category_id = pc.id
GROUP BY p.id, p.sku, p.product_name, pc.name
ORDER BY total_tickets DESC;

-- View: Quotes Report
CREATE OR REPLACE VIEW v_quotes_report AS
SELECT
  q.id,
  q.quote_number,
  q.customer_id,
  c.company_name AS customer_name,
  q.total,
  q.status,
  q.created_at,
  q.sent_at,
  q.accepted_at,
  q.rejected_at,
  u.full_name AS salesperson_name,
  EXTRACT(EPOCH FROM (q.accepted_at - q.sent_at))/3600 AS hours_to_acceptance
FROM quotations q
LEFT JOIN customers c ON q.customer_id = c.id
LEFT JOIN users u ON q.assigned_salesperson = u.id
WHERE q.deleted_at IS NULL;

-- ============================================================
-- ENABLE ROW LEVEL SECURITY on all tables
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: Get current user role
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- system_settings: super_admin can edit, everyone can read
CREATE POLICY "settings_read_all" ON system_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "settings_write_super_admin" ON system_settings FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

-- users: read all authenticated, write super_admin only
CREATE POLICY "users_read_all" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "users_write_super_admin" ON users FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- customers: technicians see limited data via separate policy
CREATE POLICY "customers_all_except_technician" ON customers FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'accountant', 'manager'));
CREATE POLICY "customers_technician_read" ON customers FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'technician' AND
    id IN (SELECT customer_id FROM projects p
           JOIN project_technicians pt ON pt.project_id = p.id
           WHERE pt.technician_id = auth.uid())
  );
CREATE POLICY "customers_write" ON customers FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales'));

-- leads: sales and super_admin
CREATE POLICY "leads_read" ON leads FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'manager'));
CREATE POLICY "leads_write" ON leads FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales'));

-- quotations: technicians have NO access
CREATE POLICY "quotations_read" ON quotations FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'accountant', 'manager'));
CREATE POLICY "quotations_write" ON quotations FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales'));

CREATE POLICY "quotation_lines_read" ON quotation_lines FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'accountant', 'manager'));
CREATE POLICY "quotation_lines_write" ON quotation_lines FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales'));

-- invoices: technicians have NO access
CREATE POLICY "invoices_read" ON invoices FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'accountant', 'manager', 'sales'));
CREATE POLICY "invoices_write" ON invoices FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'accountant'));

CREATE POLICY "invoice_lines_read" ON invoice_lines FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'accountant', 'manager', 'sales'));
CREATE POLICY "invoice_lines_write" ON invoice_lines FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'accountant'));

-- payments: technicians have NO access
CREATE POLICY "payments_read" ON payments FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'accountant', 'manager'));
CREATE POLICY "payments_write" ON payments FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'accountant'));

-- products: everyone can read, only admin/sales can write
CREATE POLICY "products_read_all" ON products FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "products_write" ON products FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales'));

CREATE POLICY "categories_read_all" ON product_categories FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "categories_write" ON product_categories FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales'));

CREATE POLICY "suppliers_read" ON suppliers FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'accountant', 'manager'));
CREATE POLICY "suppliers_write" ON suppliers FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales'));

CREATE POLICY "stock_adjustments_read" ON stock_adjustments FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'accountant', 'manager'));
CREATE POLICY "stock_adjustments_write" ON stock_adjustments FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales'));

-- projects: technicians see ONLY their assigned projects
CREATE POLICY "projects_read_all_roles" ON projects FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'accountant', 'manager'));
CREATE POLICY "projects_read_technician" ON projects FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'technician' AND
    id IN (SELECT project_id FROM project_technicians WHERE technician_id = auth.uid())
  );
CREATE POLICY "projects_write" ON projects FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'manager'));
CREATE POLICY "projects_update_technician" ON projects FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'technician' AND
    id IN (SELECT project_id FROM project_technicians WHERE technician_id = auth.uid())
  );

CREATE POLICY "project_technicians_read" ON project_technicians FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "project_technicians_write" ON project_technicians FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'manager'));

CREATE POLICY "project_products_read" ON project_products FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "project_products_write" ON project_products FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'manager'));

CREATE POLICY "project_files_read" ON project_files FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "project_files_write" ON project_files FOR ALL
  USING (auth.role() = 'authenticated');

-- tickets: technicians see only their assigned tickets
CREATE POLICY "tickets_read_all_roles" ON support_tickets FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'accountant', 'manager'));
CREATE POLICY "tickets_read_technician" ON support_tickets FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'technician' AND
    assigned_technician_id = auth.uid()
  );
CREATE POLICY "tickets_write" ON support_tickets FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'manager'));
CREATE POLICY "tickets_update_technician" ON support_tickets FOR UPDATE
  USING (
    get_user_role(auth.uid()) = 'technician' AND
    assigned_technician_id = auth.uid()
  );

CREATE POLICY "ticket_comments_read" ON ticket_comments FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "ticket_comments_write" ON ticket_comments FOR ALL
  USING (auth.role() = 'authenticated');

-- contracts: no technician access
CREATE POLICY "contracts_read" ON maintenance_contracts FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'accountant', 'manager'));
CREATE POLICY "contracts_write" ON maintenance_contracts FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales'));

CREATE POLICY "contract_invoices_read" ON contract_invoices FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'accountant', 'manager'));
CREATE POLICY "contract_invoices_write" ON contract_invoices FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'accountant'));

-- activity_logs: super_admin sees all, others see own actions
CREATE POLICY "activity_logs_super_admin" ON activity_logs FOR SELECT
  USING (get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "activity_logs_manager" ON activity_logs FOR SELECT
  USING (get_user_role(auth.uid()) = 'manager');
CREATE POLICY "activity_logs_own" ON activity_logs FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKETS (run in Supabase dashboard or via API)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-files', 'ticket-files', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
