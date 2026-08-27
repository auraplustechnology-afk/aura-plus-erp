-- ============================================================
-- AURA PLUS ERP - POINT OF SALE (POS) MIGRATION
-- Run this in the Supabase SQL Editor.
--
-- IMPORTANT: Run in TWO separate pastes/executions.
-- Postgres will not let a script reference an enum value that
-- was added earlier in the SAME transaction/statement batch, so
-- Section A (enum extensions) MUST be run and committed first.
-- ============================================================


-- ============================================================
-- SECTION A — run this block FIRST, on its own
-- ============================================================

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'card';
ALTER TYPE invoice_type ADD VALUE IF NOT EXISTS 'pos';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'voided';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'voided';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'discount_applied';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'shift_opened';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'shift_closed';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'cash_in';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'cash_out';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'sale_held';
ALTER TYPE activity_action ADD VALUE IF NOT EXISTS 'sale_resumed';
ALTER TYPE activity_entity ADD VALUE IF NOT EXISTS 'pos_sale';
ALTER TYPE activity_entity ADD VALUE IF NOT EXISTS 'shift';
ALTER TYPE activity_entity ADD VALUE IF NOT EXISTS 'refund';
ALTER TYPE activity_entity ADD VALUE IF NOT EXISTS 'held_sale';

-- ============================================================
-- STOP HERE. Run everything above this line, wait for it to
-- succeed, THEN run everything below as a second execution.
-- ============================================================


-- ============================================================
-- SECTION B — run this block SECOND
-- ============================================================

-- ── New enums ──────────────────────────────────────────────
CREATE TYPE pos_shift_status AS ENUM ('open', 'closed');
CREATE TYPE pos_cash_movement_type AS ENUM ('cash_in', 'cash_out');
CREATE TYPE pos_hold_status AS ENUM ('held', 'resumed', 'cancelled');

-- ── products: barcode for scanner lookup ────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique
  ON products(barcode) WHERE barcode IS NOT NULL;

-- ============================================================
-- TABLE: pos_shifts
-- One open shift per cashier at a time (enforced by the partial
-- unique index below).
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opened_by UUID NOT NULL REFERENCES users(id),
  opening_float NUMERIC(15,2) NOT NULL DEFAULT 0,
  status pos_shift_status NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES users(id),
  expected_cash NUMERIC(15,2),
  closing_cash_counted NUMERIC(15,2),
  cash_variance NUMERIC(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_shifts_one_open_per_cashier
  ON pos_shifts(opened_by) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_pos_shifts_status ON pos_shifts(status);

-- ── invoices: POS-specific additions (all additive/nullable) ─
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES pos_shifts(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS void_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_invoices_shift_id ON invoices(shift_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);

-- ============================================================
-- TABLE: pos_cash_movements (cash-in / cash-out during a shift)
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_cash_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES pos_shifts(id),
  movement_type pos_cash_movement_type NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_cash_movements_shift_id ON pos_cash_movements(shift_id);

-- ============================================================
-- TABLE: pos_held_sales (suspended carts, resumed at the till)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS pos_hold_number_seq START 1;

CREATE TABLE IF NOT EXISTS pos_held_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hold_reference TEXT UNIQUE NOT NULL,
  shift_id UUID NOT NULL REFERENCES pos_shifts(id),
  customer_id UUID REFERENCES customers(id),
  cart JSONB NOT NULL,
  note TEXT,
  status pos_hold_status NOT NULL DEFAULT 'held',
  held_by UUID REFERENCES users(id),
  held_at TIMESTAMPTZ DEFAULT NOW(),
  resumed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pos_held_sales_shift_id ON pos_held_sales(shift_id);
CREATE INDEX IF NOT EXISTS idx_pos_held_sales_status ON pos_held_sales(status);

-- ============================================================
-- TABLES: pos_refunds / pos_refund_lines
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS pos_refund_number_seq START 1;

CREATE TABLE IF NOT EXISTS pos_refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  refund_number TEXT UNIQUE NOT NULL,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  shift_id UUID REFERENCES pos_shifts(id),
  refund_method payment_method NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  payment_id UUID REFERENCES payments(id),
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_refunds_invoice_id ON pos_refunds(invoice_id);

CREATE TABLE IF NOT EXISTS pos_refund_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  refund_id UUID NOT NULL REFERENCES pos_refunds(id) ON DELETE CASCADE,
  invoice_line_id UUID NOT NULL REFERENCES invoice_lines(id),
  product_id UUID REFERENCES products(id),
  quantity NUMERIC(10,2) NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  restocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_refund_lines_refund_id ON pos_refund_lines(refund_id);
CREATE INDEX IF NOT EXISTS idx_pos_refund_lines_invoice_line_id ON pos_refund_lines(invoice_line_id);

-- ============================================================
-- FUNCTIONS: Document number generation (same pattern as
-- generate_invoice_number / generate_quote_number etc.)
-- ============================================================
CREATE OR REPLACE FUNCTION generate_refund_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  seq_num TEXT := LPAD(nextval('pos_refund_number_seq')::TEXT, 5, '0');
BEGIN
  RETURN 'REF-' || year_str || '-' || seq_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_hold_reference()
RETURNS TEXT AS $$
DECLARE
  seq_num TEXT := LPAD(nextval('pos_hold_number_seq')::TEXT, 5, '0');
BEGIN
  RETURN 'HOLD-' || seq_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: complete_pos_sale
--
-- Atomically creates a paid POS invoice (invoice + lines +
-- payments) and deducts stock, all in one transaction with
-- row-level locking so stock can never be oversold. Runs as
-- SECURITY DEFINER because the 'sales' role is intentionally
-- blocked by invoices_write/payments_write RLS — this function
-- does its own internal role check instead of relying on RLS.
--
-- p_lines:    [{ line_type, product_id, description, quantity, unit_price }]
-- p_payments: [{ method, amount, reference_number, notes }]
--             Amounts must be the NET amount applied to the sale
--             (i.e. cash tendered minus change given) — they must
--             sum to exactly the sale total.
-- ============================================================
CREATE OR REPLACE FUNCTION complete_pos_sale(
  p_customer_id UUID,
  p_shift_id UUID,
  p_lines JSONB,
  p_discount_amount NUMERIC,
  p_payments JSONB,
  p_tot_note TEXT DEFAULT 'Subject to TOT'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_role user_role;
  v_line JSONB;
  v_pay JSONB;
  v_product RECORD;
  v_qty NUMERIC;
  v_unit_price NUMERIC;
  v_line_total NUMERIC;
  v_subtotal NUMERIC := 0;
  v_total NUMERIC := 0;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_line_type line_type;
  v_product_id UUID;
  v_description TEXT;
  v_payments_total NUMERIC := 0;
  v_discount NUMERIC := COALESCE(p_discount_amount, 0);
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_role FROM users WHERE id = v_caller;
  IF v_role IS NULL OR v_role NOT IN ('super_admin', 'sales', 'manager') THEN
    RAISE EXCEPTION 'Not authorized to complete POS sales';
  END IF;

  IF v_discount < 0 THEN
    RAISE EXCEPTION 'Discount cannot be negative';
  END IF;
  IF v_discount > 0 AND v_role NOT IN ('super_admin', 'manager') THEN
    RAISE EXCEPTION 'Only managers or super admins can apply a discount';
  END IF;

  PERFORM 1 FROM pos_shifts WHERE id = p_shift_id AND status = 'open';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No open shift found for this sale';
  END IF;

  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Cannot complete a sale with no items';
  END IF;

  -- Pass 1: lock every product row FOR UPDATE, validate stock,
  -- and accumulate the subtotal. If any line is short on stock
  -- the whole function aborts and NOTHING is written.
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_product_id := NULLIF(v_line->>'product_id', '')::UUID;
    v_qty := COALESCE((v_line->>'quantity')::NUMERIC, 0);
    v_unit_price := COALESCE((v_line->>'unit_price')::NUMERIC, 0);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Line quantity must be greater than zero';
    END IF;

    IF v_product_id IS NOT NULL THEN
      SELECT * INTO v_product FROM products WHERE id = v_product_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
      END IF;
      IF v_product.quantity_in_stock < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for %: have %, need %',
          v_product.product_name, v_product.quantity_in_stock, v_qty;
      END IF;
    END IF;

    v_subtotal := v_subtotal + (v_unit_price * v_qty);
  END LOOP;

  v_total := GREATEST(v_subtotal - v_discount, 0);

  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    v_payments_total := v_payments_total + COALESCE((v_pay->>'amount')::NUMERIC, 0);
  END LOOP;

  IF ABS(v_payments_total - v_total) > 0.01 THEN
    RAISE EXCEPTION 'Payment total (%) does not match sale total (%)', v_payments_total, v_total;
  END IF;

  v_invoice_number := generate_invoice_number();

  INSERT INTO invoices (
    invoice_number, invoice_type, customer_id, created_by,
    subtotal, discount_amount, total, tot_note, payment_terms,
    stock_deducted, stock_deducted_at, shift_id
  ) VALUES (
    v_invoice_number, 'pos', p_customer_id, v_caller,
    v_subtotal, v_discount, v_total, p_tot_note, 'Due on Receipt',
    TRUE, NOW(), p_shift_id
  ) RETURNING id INTO v_invoice_id;

  -- Pass 2: insert lines and deduct stock (rows are still locked
  -- from pass 1 within this same transaction).
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_product_id := NULLIF(v_line->>'product_id', '')::UUID;
    v_description := v_line->>'description';
    v_qty := COALESCE((v_line->>'quantity')::NUMERIC, 0);
    v_unit_price := COALESCE((v_line->>'unit_price')::NUMERIC, 0);
    v_line_type := COALESCE(NULLIF(v_line->>'line_type', '')::line_type, 'product');
    v_line_total := v_qty * v_unit_price;

    INSERT INTO invoice_lines (invoice_id, line_type, product_id, description, quantity, unit_price, line_total)
    VALUES (v_invoice_id, v_line_type, v_product_id, v_description, v_qty, v_unit_price, v_line_total);

    IF v_product_id IS NOT NULL THEN
      SELECT * INTO v_product FROM products WHERE id = v_product_id FOR UPDATE;
      UPDATE products SET quantity_in_stock = quantity_in_stock - v_qty WHERE id = v_product_id;
      INSERT INTO stock_adjustments (
        product_id, adjustment_type, quantity_before, quantity_change, quantity_after,
        reference_type, reference_id, reason, adjusted_by
      ) VALUES (
        v_product_id, 'sale', v_product.quantity_in_stock, -v_qty, v_product.quantity_in_stock - v_qty,
        'invoice', v_invoice_id, 'POS sale ' || v_invoice_number, v_caller
      );
    END IF;
  END LOOP;

  -- Insert payments. The existing trigger_update_invoice_balance
  -- trigger recalculates amount_paid / outstanding_balance / status
  -- / paid_at — that logic is deliberately NOT duplicated here.
  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO payments (invoice_id, amount, payment_method, reference_number, notes, recorded_by)
    VALUES (
      v_invoice_id,
      COALESCE((v_pay->>'amount')::NUMERIC, 0),
      COALESCE(NULLIF(v_pay->>'method', '')::payment_method, 'cash'),
      NULLIF(v_pay->>'reference_number', ''),
      NULLIF(v_pay->>'notes', ''),
      v_caller
    );
  END LOOP;

  RETURN v_invoice_id;
END;
$$;

-- ============================================================
-- FUNCTION: void_pos_sale
--
-- Restricted to super_admin/manager. Restores stock for every
-- product line and flips the invoice to 'voided'. Payment rows
-- are left untouched as an audit trail — reports must exclude
-- voided invoices from revenue.
-- ============================================================
CREATE OR REPLACE FUNCTION void_pos_sale(
  p_invoice_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_role user_role;
  v_invoice RECORD;
  v_line RECORD;
  v_product RECORD;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_role FROM users WHERE id = v_caller;
  IF v_role IS NULL OR v_role NOT IN ('super_admin', 'manager') THEN
    RAISE EXCEPTION 'Not authorized to void sales';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A void reason is required';
  END IF;

  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id AND invoice_type = 'pos' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS sale not found';
  END IF;
  IF v_invoice.status = 'voided' THEN
    RAISE EXCEPTION 'Sale is already voided';
  END IF;

  FOR v_line IN SELECT * FROM invoice_lines WHERE invoice_id = p_invoice_id AND product_id IS NOT NULL
  LOOP
    SELECT * INTO v_product FROM products WHERE id = v_line.product_id FOR UPDATE;
    IF FOUND THEN
      UPDATE products SET quantity_in_stock = quantity_in_stock + v_line.quantity WHERE id = v_line.product_id;
      INSERT INTO stock_adjustments (
        product_id, adjustment_type, quantity_before, quantity_change, quantity_after,
        reference_type, reference_id, reason, adjusted_by
      ) VALUES (
        v_line.product_id, 'in', v_product.quantity_in_stock, v_line.quantity, v_product.quantity_in_stock + v_line.quantity,
        'invoice', p_invoice_id, 'Void of ' || v_invoice.invoice_number, v_caller
      );
    END IF;
  END LOOP;

  UPDATE invoices
  SET status = 'voided', voided_at = NOW(), voided_by = v_caller, void_reason = p_reason
  WHERE id = p_invoice_id;
END;
$$;

-- ============================================================
-- FUNCTION: process_pos_refund
--
-- Restricted to super_admin/manager. Validates the refund against
-- what remains refundable on each line, optionally restocks, and
-- inserts a NEGATIVE payments row (payments.amount has no CHECK > 0
-- constraint) so the existing balance trigger reduces amount_paid /
-- outstanding_balance correctly instead of duplicating that math.
-- ============================================================
CREATE OR REPLACE FUNCTION process_pos_refund(
  p_invoice_id UUID,
  p_shift_id UUID,
  p_lines JSONB,
  p_refund_method payment_method,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_role user_role;
  v_invoice RECORD;
  v_line JSONB;
  v_invoice_line RECORD;
  v_product RECORD;
  v_qty NUMERIC;
  v_restock BOOLEAN;
  v_refund_amount NUMERIC := 0;
  v_line_amount NUMERIC;
  v_already_refunded NUMERIC;
  v_refund_id UUID;
  v_refund_number TEXT;
  v_payment_id UUID;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_role FROM users WHERE id = v_caller;
  IF v_role IS NULL OR v_role NOT IN ('super_admin', 'manager') THEN
    RAISE EXCEPTION 'Not authorized to process refunds';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A refund reason is required';
  END IF;
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Select at least one line to refund';
  END IF;

  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id AND invoice_type = 'pos' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POS sale not found';
  END IF;
  IF v_invoice.status = 'voided' THEN
    RAISE EXCEPTION 'Cannot refund a voided sale';
  END IF;

  v_refund_number := generate_refund_number();
  INSERT INTO pos_refunds (refund_number, invoice_id, shift_id, refund_method, amount, reason, processed_by)
  VALUES (v_refund_number, p_invoice_id, p_shift_id, p_refund_method, 0, p_reason, v_caller)
  RETURNING id INTO v_refund_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_invoice_line FROM invoice_lines
      WHERE id = (v_line->>'invoice_line_id')::UUID AND invoice_id = p_invoice_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invoice line not found on this sale';
    END IF;

    v_qty := COALESCE((v_line->>'quantity')::NUMERIC, v_invoice_line.quantity);
    IF v_qty <= 0 OR v_qty > v_invoice_line.quantity THEN
      RAISE EXCEPTION 'Invalid refund quantity for line %', v_invoice_line.description;
    END IF;

    SELECT COALESCE(SUM(rl.quantity), 0) INTO v_already_refunded
      FROM pos_refund_lines rl WHERE rl.invoice_line_id = v_invoice_line.id;
    IF v_already_refunded + v_qty > v_invoice_line.quantity THEN
      RAISE EXCEPTION 'Refund quantity exceeds remaining refundable quantity for %', v_invoice_line.description;
    END IF;

    v_line_amount := ROUND(v_invoice_line.unit_price * v_qty, 2);
    v_restock := COALESCE((v_line->>'restock')::BOOLEAN, TRUE) AND v_invoice_line.product_id IS NOT NULL;

    INSERT INTO pos_refund_lines (refund_id, invoice_line_id, product_id, quantity, amount, restocked)
    VALUES (v_refund_id, v_invoice_line.id, v_invoice_line.product_id, v_qty, v_line_amount, v_restock);

    IF v_restock THEN
      SELECT * INTO v_product FROM products WHERE id = v_invoice_line.product_id FOR UPDATE;
      IF FOUND THEN
        UPDATE products SET quantity_in_stock = quantity_in_stock + v_qty WHERE id = v_invoice_line.product_id;
        INSERT INTO stock_adjustments (
          product_id, adjustment_type, quantity_before, quantity_change, quantity_after,
          reference_type, reference_id, reason, adjusted_by
        ) VALUES (
          v_invoice_line.product_id, 'in', v_product.quantity_in_stock, v_qty, v_product.quantity_in_stock + v_qty,
          'invoice', p_invoice_id, 'Refund ' || v_refund_number, v_caller
        );
      END IF;
    END IF;

    v_refund_amount := v_refund_amount + v_line_amount;
  END LOOP;

  IF v_refund_amount > v_invoice.amount_paid THEN
    RAISE EXCEPTION 'Refund amount (%) exceeds amount paid on this sale (%)', v_refund_amount, v_invoice.amount_paid;
  END IF;

  UPDATE pos_refunds SET amount = v_refund_amount WHERE id = v_refund_id;

  INSERT INTO payments (invoice_id, amount, payment_method, reference_number, notes, recorded_by)
  VALUES (p_invoice_id, -v_refund_amount, p_refund_method, v_refund_number, 'Refund: ' || p_reason, v_caller)
  RETURNING id INTO v_payment_id;

  UPDATE pos_refunds SET payment_id = v_payment_id WHERE id = v_refund_id;

  RETURN v_refund_id;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_pos_sale(UUID, UUID, JSONB, NUMERIC, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION void_pos_sale(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_pos_refund(UUID, UUID, JSONB, payment_method, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_refund_number() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_hold_reference() TO authenticated;

-- ============================================================
-- RLS POLICIES — same split read/write pattern used by
-- invoices/payments, NOT the looser "allow_all_authenticated"
-- pattern. Direct writes to pos_refunds/pos_refund_lines are
-- intentionally left with NO write policy — the only way to
-- write those tables is through process_pos_refund(), which
-- runs SECURITY DEFINER and bypasses RLS after its own internal
-- role check.
-- ============================================================
ALTER TABLE pos_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_held_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_refund_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_shifts_read" ON pos_shifts FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'accountant', 'manager'));
CREATE POLICY "pos_shifts_write" ON pos_shifts FOR ALL
  USING (
    get_user_role(auth.uid()) IN ('super_admin', 'manager')
    OR (get_user_role(auth.uid()) = 'sales' AND opened_by = auth.uid())
  );

CREATE POLICY "pos_cash_movements_read" ON pos_cash_movements FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'accountant', 'manager'));
CREATE POLICY "pos_cash_movements_write" ON pos_cash_movements FOR ALL
  USING (
    get_user_role(auth.uid()) IN ('super_admin', 'manager')
    OR (get_user_role(auth.uid()) = 'sales' AND shift_id IN (SELECT id FROM pos_shifts WHERE opened_by = auth.uid()))
  );

CREATE POLICY "pos_held_sales_read" ON pos_held_sales FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'manager') OR held_by = auth.uid());
CREATE POLICY "pos_held_sales_write" ON pos_held_sales FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'manager') OR held_by = auth.uid());

CREATE POLICY "pos_refunds_read" ON pos_refunds FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'accountant', 'manager'));

CREATE POLICY "pos_refund_lines_read" ON pos_refund_lines FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'sales', 'accountant', 'manager'));

-- ============================================================
-- SEED: Walk-in Customer (POS's default customer — invoices.
-- customer_id is NOT NULL, so a real customer row is needed for
-- over-the-counter sales with no account). Inserted idempotently.
-- ============================================================
INSERT INTO customers (company_name, customer_type, source, notes)
SELECT 'Walk-in Customer', 'active', 'walk_in', 'Default customer for POS over-the-counter sales with no account on file'
WHERE NOT EXISTS (
  SELECT 1 FROM customers WHERE company_name = 'Walk-in Customer' AND source = 'walk_in'
);

-- ============================================================
-- VERIFY
-- SELECT proname FROM pg_proc WHERE proname IN
--   ('complete_pos_sale','void_pos_sale','process_pos_refund','generate_refund_number','generate_hold_reference');
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public'
--   AND table_name IN ('pos_shifts','pos_cash_movements','pos_held_sales','pos_refunds','pos_refund_lines');
-- SELECT id, company_name FROM customers WHERE source = 'walk_in';
-- ============================================================
