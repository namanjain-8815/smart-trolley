-- SmartTrolley Supabase SQL Schema
-- Run this in the Supabase SQL Editor

-- ─── PRODUCTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode       TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  price         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  gst_percent   NUMERIC(5, 2)  NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  weight_grams  INTEGER        NOT NULL DEFAULT 0,
  stock_qty     INTEGER        NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── TROLLEY SESSIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trolley_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trolley_id      TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'checkout', 'paid')),
  current_weight  NUMERIC(10, 2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ─── SCANNED ITEMS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scanned_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES trolley_sessions(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id),
  quantity         INTEGER NOT NULL DEFAULT 1,
  unit_price       NUMERIC(10, 2) NOT NULL,
  gst_percent      NUMERIC(5, 2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  gst_amount       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_amount  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  subtotal         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  weight_expected  INTEGER,
  verified         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PAYMENTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID UNIQUE NOT NULL REFERENCES trolley_sessions(id) ON DELETE CASCADE,
  amount      NUMERIC(10, 2) NOT NULL,
  upi_txn_id  TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_trolley_status ON trolley_sessions(trolley_id, status);
CREATE INDEX IF NOT EXISTS idx_scanned_session ON scanned_items(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at) WHERE status = 'paid';

-- ─── DECREMENT STOCK FUNCTION ────────────────────────────────────
-- Called by /api/payment/confirm to reduce inventory
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_qty INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock_qty = GREATEST(0, stock_qty - p_qty)
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────
-- Enable RLS on all tables (the service role key bypasses RLS)
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trolley_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanned_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;

-- Allow anon reads for products (barcode lookup by ESP32 via anon key)
CREATE POLICY "Public product reads" ON products FOR SELECT USING (true);

-- ─── SAMPLE DATA ────────────────────────────────────────────────
-- Uncomment to insert sample products for testing:
/*
INSERT INTO products (barcode, name, price, gst_percent, discount_percent, weight_grams, stock_qty) VALUES
  ('8901234567890', 'Amul Butter 500g',            265.00, 5,  0,  500, 100),
  ('8901719100222', 'Tata Salt 1kg',                20.00, 0,  5,  1000, 200),
  ('8901030865671', 'Parle-G Biscuit 800g',         85.00, 18, 10, 800,  150),
  ('8906002660137', 'Maggi Noodles 70g',            15.00, 18, 0,  70,   300),
  ('8901491506000', 'Surf Excel 1kg',              145.00, 18, 5,  1000, 80),
  ('8901038530527', 'Fortune Sunflower Oil 1L',    140.00, 5,  0,  900,  50),
  ('8906002361001', 'Rin Detergent 1kg',            95.00, 18, 0,  1000, 90),
  ('8901030001024', 'Britannia Marie Gold 200g',    30.00, 18, 0,  200,  180);
*/
