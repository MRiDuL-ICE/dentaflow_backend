exports.up = (pgm) => {
  // Suppliers
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name         TEXT        NOT NULL,
      contact_name TEXT,
      email        TEXT,
      phone        TEXT,
      address      JSONB       DEFAULT '{}',
      notes        TEXT,
      is_active    BOOLEAN     NOT NULL DEFAULT true,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Inventory items
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      supplier_id     UUID          REFERENCES suppliers(id),
      name            TEXT          NOT NULL,
      sku             TEXT          UNIQUE,
      category        TEXT,
      description     TEXT,
      unit            TEXT          NOT NULL DEFAULT 'piece',
      unit_cost       NUMERIC(10,2) NOT NULL DEFAULT 0,
      quantity        NUMERIC(10,2) NOT NULL DEFAULT 0
                                    CHECK (quantity >= 0),
      reorder_level   NUMERIC(10,2) NOT NULL DEFAULT 0,
      expiry_date     DATE,
      is_active       BOOLEAN       NOT NULL DEFAULT true,
      created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_inventory_name
    ON inventory_items (name)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_inventory_supplier
    ON inventory_items (supplier_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_inventory_low_stock
    ON inventory_items (quantity, reorder_level)
    WHERE is_active = true`);

  // Purchase orders
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      supplier_id  UUID          NOT NULL REFERENCES suppliers(id),
      status       TEXT          NOT NULL DEFAULT 'pending'
                                 CHECK (status IN (
                                   'pending','ordered','received',
                                   'partial','cancelled'
                                 )),
      total        NUMERIC(10,2) NOT NULL DEFAULT 0,
      notes        TEXT,
      ordered_at   TIMESTAMPTZ,
      received_at  TIMESTAMPTZ,
      created_by   UUID          NOT NULL,
      created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_po_supplier
    ON purchase_orders (supplier_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_po_status
    ON purchase_orders (status)`);

  // Purchase order items
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      po_id        UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      item_id      UUID          NOT NULL REFERENCES inventory_items(id),
      quantity     NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
      unit_cost    NUMERIC(10,2) NOT NULL,
      received_qty NUMERIC(10,2) DEFAULT 0,
      expiry_date  DATE,
      created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_po_items_po
    ON purchase_order_items (po_id)`);

  // Inventory transactions (audit trail for all stock movements)
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id      UUID          NOT NULL REFERENCES inventory_items(id),
      type         TEXT          NOT NULL
                                 CHECK (type IN (
                                   'purchase','adjustment','treatment_use',
                                   'return','expired','transfer'
                                 )),
      quantity     NUMERIC(10,2) NOT NULL,
      balance      NUMERIC(10,2) NOT NULL,
      reference_id UUID,
      notes        TEXT,
      created_by   UUID          NOT NULL,
      created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_inv_transactions_item
    ON inventory_transactions (item_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_inv_transactions_type
    ON inventory_transactions (type)`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS inventory_transactions`);
  pgm.sql(`DROP TABLE IF EXISTS purchase_order_items`);
  pgm.sql(`DROP TABLE IF EXISTS purchase_orders`);
  pgm.sql(`DROP TABLE IF EXISTS inventory_items`);
  pgm.sql(`DROP TABLE IF EXISTS suppliers`);
};
