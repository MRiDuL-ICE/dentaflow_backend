exports.up = (pgm) => {
  // Running record — 32 rows per patient
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS odontogram_current (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id   UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      tooth_number SMALLINT    NOT NULL CHECK (tooth_number BETWEEN 1 AND 32),
      status       TEXT        NOT NULL DEFAULT 'healthy'
                               CHECK (status IN (
                                 'healthy','cavity','missing','crowned',
                                 'implant','bridge','root_canal','extracted',
                                 'fracture','watch'
                               )),
      pocket_depth SMALLINT[]  DEFAULT ARRAY[0,0,0,0,0,0],
      mobility     SMALLINT    DEFAULT 0 CHECK (mobility BETWEEN 0 AND 3),
      furcation    SMALLINT    DEFAULT 0 CHECK (furcation BETWEEN 0 AND 3),
      bleeding     BOOLEAN[]   DEFAULT ARRAY[false,false,false,false,false,false],
      notes        TEXT,
      updated_by   UUID        NOT NULL,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (patient_id, tooth_number)
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_odontogram_current_patient
    ON odontogram_current (patient_id)`);

  // Snapshots — per visit per tooth
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS odontogram_snapshots (
      id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id     UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      appointment_id UUID,
      tooth_number   SMALLINT    NOT NULL CHECK (tooth_number BETWEEN 1 AND 32),
      status         TEXT        NOT NULL DEFAULT 'healthy',
      pocket_depth   SMALLINT[]  DEFAULT ARRAY[0,0,0,0,0,0],
      mobility       SMALLINT    DEFAULT 0,
      furcation      SMALLINT    DEFAULT 0,
      bleeding       BOOLEAN[]   DEFAULT ARRAY[false,false,false,false,false,false],
      notes          TEXT,
      recorded_by    UUID        NOT NULL,
      recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_odontogram_snapshots_patient
    ON odontogram_snapshots (patient_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_odontogram_snapshots_appointment
    ON odontogram_snapshots (appointment_id)`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS odontogram_snapshots`);
  pgm.sql(`DROP TABLE IF EXISTS odontogram_current`);
};
