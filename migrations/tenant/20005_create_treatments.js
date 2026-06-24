exports.up = (pgm) => {
  // Treatment categories
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS treatment_categories (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT        UNIQUE NOT NULL,
      color      TEXT        DEFAULT '#1D9E75',
      is_active  BOOLEAN     NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Seed default categories
  pgm.sql(`
    INSERT INTO treatment_categories (name, color) VALUES
      ('Restorative',   '#1D9E75'),
      ('Orthodontics',  '#3B82F6'),
      ('Surgery',       '#EF4444'),
      ('Endodontics',   '#F59E0B'),
      ('Periodontics',  '#8B5CF6'),
      ('Prosthodontics','#EC4899'),
      ('Preventive',    '#06B6D4'),
      ('Diagnostic',    '#6B7280')
    ON CONFLICT (name) DO NOTHING
  `);

  // Treatment catalog
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS treatments (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id     UUID        REFERENCES treatment_categories(id),
      name            TEXT        NOT NULL,
      description     TEXT,
      base_cost       NUMERIC(10,2) NOT NULL DEFAULT 0,
      duration_minutes INT         DEFAULT 30,
      tooth_applicable BOOLEAN    NOT NULL DEFAULT true,
      is_active       BOOLEAN     NOT NULL DEFAULT true,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_treatments_category
    ON treatments (category_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_treatments_name
    ON treatments USING gin(to_tsvector('english', name))`);

  // Treatment plans
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS treatment_plans (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id  UUID        NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
      title       TEXT        NOT NULL,
      notes       TEXT,
      status      TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN (
                                'draft','active','completed','cancelled'
                              )),
      is_active   BOOLEAN     NOT NULL DEFAULT false,
      created_by  UUID        NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient
    ON treatment_plans (patient_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_treatment_plans_status
    ON treatment_plans (status)`);

  // Treatment plan items
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS treatment_plan_items (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id         UUID        NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
      treatment_id    UUID        REFERENCES treatments(id),
      name            TEXT        NOT NULL,
      tooth_numbers   SMALLINT[],
      region          TEXT        CHECK (region IN (
                                    'upper_left','upper_right',
                                    'lower_left','lower_right',
                                    'full_mouth','upper','lower'
                                  )),
      quantity        INT         NOT NULL DEFAULT 1,
      unit_cost       NUMERIC(10,2) NOT NULL,
      discount        NUMERIC(5,2) DEFAULT 0,
      total_cost      NUMERIC(10,2) GENERATED ALWAYS AS
                        (quantity * unit_cost * (1 - discount/100)) STORED,
      status          TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN (
                                    'pending','in_progress',
                                    'completed','cancelled'
                                  )),
      notes           TEXT,
      materials_used  JSONB       DEFAULT '[]',
      sort_order      INT         DEFAULT 0,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_plan_items_plan
    ON treatment_plan_items (plan_id)`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS treatment_plan_items`);
  pgm.sql(`DROP TABLE IF EXISTS treatment_plans`);
  pgm.sql(`DROP TABLE IF EXISTS treatments`);
  pgm.sql(`DROP TABLE IF EXISTS treatment_categories`);
};
