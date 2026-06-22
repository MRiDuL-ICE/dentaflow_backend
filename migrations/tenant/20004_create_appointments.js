exports.up = (pgm) => {
  // Chairs
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS chairs (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT        NOT NULL,
      is_active  BOOLEAN     NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Seed default chairs
  pgm.sql(`
    INSERT INTO chairs (name) VALUES
      ('Chair 1'), ('Chair 2'), ('Chair 3')
    ON CONFLICT DO NOTHING
  `);

  // Appointments
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS appointments (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id       UUID        NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
      dentist_id       UUID        NOT NULL,
      chair_id         UUID        REFERENCES chairs(id) ON DELETE SET NULL,
      treatment_type   TEXT        NOT NULL,
      duration_minutes INT         NOT NULL DEFAULT 30
                                   CHECK (duration_minutes > 0),
      scheduled_at     TIMESTAMPTZ NOT NULL,
      status           TEXT        NOT NULL DEFAULT 'scheduled'
                                   CHECK (status IN (
                                     'scheduled','confirmed','in_progress',
                                     'completed','cancelled','no_show'
                                   )),
      notes            TEXT,
      created_by       UUID        NOT NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_appointments_patient
    ON appointments (patient_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_appointments_dentist
    ON appointments (dentist_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at
    ON appointments (scheduled_at)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_appointments_status
    ON appointments (status)`);

  // Status history
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS appointment_status_history (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      appointment_id   UUID        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      from_status      TEXT,
      to_status        TEXT        NOT NULL,
      reason           TEXT,
      rescheduled_to   TIMESTAMPTZ,
      changed_by       UUID        NOT NULL,
      changed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_appt_status_history_appointment
    ON appointment_status_history (appointment_id)`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS appointment_status_history`);
  pgm.sql(`DROP TABLE IF EXISTS appointments`);
  pgm.sql(`DROP TABLE IF EXISTS chairs`);
};
