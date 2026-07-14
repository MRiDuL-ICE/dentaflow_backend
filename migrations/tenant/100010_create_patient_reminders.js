exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS patient_reminders (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id      UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      appointment_id  UUID        REFERENCES appointments(id) ON DELETE CASCADE,
      type            TEXT        NOT NULL
                                  CHECK (type IN (
                                    'appointment_reminder',
                                    'followup_reminder',
                                    'recall_reminder',
                                    'payment_reminder'
                                  )),
      channel         TEXT        NOT NULL DEFAULT 'email'
                                  CHECK (channel IN ('email','sms','push')),
      status          TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN (
                                    'pending','sent','failed','cancelled'
                                  )),
      scheduled_at    TIMESTAMPTZ NOT NULL,
      sent_at         TIMESTAMPTZ,
      error_message   TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_reminders_patient
    ON patient_reminders (patient_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_reminders_status
    ON patient_reminders (status, scheduled_at)`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS patient_reminders`);
};
