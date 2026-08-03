exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS clinic_settings (
      id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      notify_email              BOOLEAN     NOT NULL DEFAULT true,
      notify_sms                BOOLEAN     NOT NULL DEFAULT false,
      notify_appointment_reminder BOOLEAN   NOT NULL DEFAULT true,
      notify_appointment_confirm  BOOLEAN   NOT NULL DEFAULT true,
      notify_billing            BOOLEAN     NOT NULL DEFAULT false,
      appearance_theme          TEXT        NOT NULL DEFAULT 'light'
                                            CHECK (appearance_theme IN ('light','dark','system')),
      appearance_language       TEXT        NOT NULL DEFAULT 'en',
      appt_default_duration     INT         NOT NULL DEFAULT 30,
      appt_slot_interval        INT         NOT NULL DEFAULT 15,
      appt_start_time           TEXT        NOT NULL DEFAULT '09:00',
      appt_end_time             TEXT        NOT NULL DEFAULT '18:00',
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    INSERT INTO clinic_settings DEFAULT VALUES
    ON CONFLICT DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS clinic_settings`);
};
