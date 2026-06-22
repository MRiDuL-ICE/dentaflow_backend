exports.up = (pgm) => {
  // Core patient table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS patients (
      id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      clinic_member_id  UUID,
      first_name        TEXT        NOT NULL,
      last_name         TEXT        NOT NULL,
      date_of_birth     DATE,
      gender            TEXT        CHECK (gender IN ('male','female','other')),
      phone             TEXT,
      email             TEXT,
      address           JSONB       DEFAULT '{}',
      medical_history   JSONB       DEFAULT '{}',
      is_deleted        BOOLEAN     NOT NULL DEFAULT false,
      deleted_at        TIMESTAMPTZ,
      deleted_by        UUID,
      created_by        UUID        NOT NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_patients_email
    ON patients (email) WHERE is_deleted = false`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_patients_phone
    ON patients (phone) WHERE is_deleted = false`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_patients_name
    ON patients (last_name, first_name) WHERE is_deleted = false`);

  // Insurance
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS patient_insurance (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id       UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      provider         TEXT        NOT NULL,
      policy_number    TEXT        NOT NULL,
      group_number     TEXT,
      coverage_details JSONB       DEFAULT '{}',
      valid_from       DATE,
      valid_until      DATE,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_patient_insurance_patient_id
    ON patient_insurance (patient_id)`);

  // Emergency contacts
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS patient_emergency_contacts (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id   UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      name         TEXT        NOT NULL,
      relationship TEXT        NOT NULL,
      phone        TEXT        NOT NULL,
      email        TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_emergency_contacts_patient_id
    ON patient_emergency_contacts (patient_id)`);

  // Custom fields
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS patient_custom_fields (
      patient_id  UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      field_key   TEXT        NOT NULL,
      field_value TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (patient_id, field_key)
    )
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS patient_custom_fields`);
  pgm.sql(`DROP TABLE IF EXISTS patient_emergency_contacts`);
  pgm.sql(`DROP TABLE IF EXISTS patient_insurance`);
  pgm.sql(`DROP TABLE IF EXISTS patients`);
};
