exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS xray_analyses (
      id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id     UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      appointment_id UUID        REFERENCES appointments(id),
      image_url      TEXT        NOT NULL,
      image_path     TEXT        NOT NULL,
      findings       JSONB       DEFAULT '{}',
      summary        TEXT,
      confidence     NUMERIC(5,4),
      model_used     TEXT,
      status         TEXT        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN (
                                   'pending','processing',
                                   'completed','failed'
                                 )),
      error_message  TEXT,
      analyzed_by    UUID,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_xray_analyses_patient
    ON xray_analyses (patient_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_xray_analyses_status
    ON xray_analyses (status)`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS xray_analyses`);
};
