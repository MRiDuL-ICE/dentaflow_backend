exports.up = (pgm) => {
  // AI chat sessions
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS ai_chat_sessions (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID        REFERENCES patients(id) ON DELETE CASCADE,
      user_id    UUID        NOT NULL,
      context    TEXT        NOT NULL DEFAULT 'patient_assistant',
      is_active  BOOLEAN     NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_chat_sessions_patient
    ON ai_chat_sessions (patient_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_chat_sessions_user
    ON ai_chat_sessions (user_id)`);

  // AI chat messages
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID        NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
      role       TEXT        NOT NULL CHECK (role IN ('user','assistant','system')),
      content    TEXT        NOT NULL,
      tokens     INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_chat_messages_session
    ON ai_chat_messages (session_id)`);

  // Clinical notes
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS clinical_notes (
      id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id     UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      appointment_id UUID        REFERENCES appointments(id),
      dentist_id     UUID        NOT NULL,
      ai_generated   TEXT,
      final_note     TEXT        NOT NULL,
      note_type      TEXT        NOT NULL DEFAULT 'general'
                                 CHECK (note_type IN (
                                   'general','treatment','examination',
                                   'prescription','followup'
                                 )),
      is_ai_assisted BOOLEAN     NOT NULL DEFAULT false,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient
    ON clinical_notes (patient_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_clinical_notes_appointment
    ON clinical_notes (appointment_id)`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS ai_chat_messages`);
  pgm.sql(`DROP TABLE IF EXISTS ai_chat_sessions`);
  pgm.sql(`DROP TABLE IF EXISTS clinical_notes`);
};
