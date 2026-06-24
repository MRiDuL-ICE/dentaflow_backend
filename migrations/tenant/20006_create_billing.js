exports.up = (pgm) => {
  // Invoices
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS invoices (
      id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id      UUID          NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
      plan_id         UUID          REFERENCES treatment_plans(id),
      appointment_id  UUID          REFERENCES appointments(id),
      invoice_number  TEXT          UNIQUE NOT NULL,
      status          TEXT          NOT NULL DEFAULT 'draft'
                                    CHECK (status IN (
                                      'draft','sent','partial',
                                      'paid','overdue','cancelled'
                                    )),
      subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
      discount        NUMERIC(5,2)  DEFAULT 0,
      tax             NUMERIC(5,2)  DEFAULT 0,
      total           NUMERIC(10,2) NOT NULL DEFAULT 0,
      amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0,
      balance         NUMERIC(10,2) GENERATED ALWAYS AS
                        (total - amount_paid) STORED,
      due_date        DATE,
      notes           TEXT,
      created_by      UUID          NOT NULL,
      created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_invoices_patient
    ON invoices (patient_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_invoices_status
    ON invoices (status)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_invoices_number
    ON invoices (invoice_number)`);

  // Invoice sequence for generating invoice numbers
  pgm.sql(`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000`);

  // Invoice items
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id   UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      plan_item_id UUID          REFERENCES treatment_plan_items(id),
      description  TEXT          NOT NULL,
      quantity     INT           NOT NULL DEFAULT 1,
      unit_cost    NUMERIC(10,2) NOT NULL,
      discount     NUMERIC(5,2)  DEFAULT 0,
      total        NUMERIC(10,2) GENERATED ALWAYS AS
                     (quantity * unit_cost * (1 - discount/100)) STORED,
      created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice
    ON invoice_items (invoice_id)`);

  // Payments
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS payments (
      id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id     UUID          NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
      amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
      method         TEXT          NOT NULL
                                   CHECK (method IN (
                                     'cash','card','bank_transfer',
                                     'insurance','bkash','nagad'
                                   )),
      reference      TEXT,
      notes          TEXT,
      paid_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
      created_by     UUID          NOT NULL,
      created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_payments_invoice
    ON payments (invoice_id)`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP SEQUENCE IF EXISTS invoice_number_seq`);
  pgm.sql(`DROP TABLE IF EXISTS payments`);
  pgm.sql(`DROP TABLE IF EXISTS invoice_items`);
  pgm.sql(`DROP TABLE IF EXISTS invoices`);
};
