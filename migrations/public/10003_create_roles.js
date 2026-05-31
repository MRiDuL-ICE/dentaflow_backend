exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.roles (
      id          SMALLINT    PRIMARY KEY,
      name        TEXT        UNIQUE NOT NULL,
      description TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    INSERT INTO public.roles (id, name, description) VALUES
      (1, 'super_admin',  'Platform-level administrator'),
      (2, 'clinic_owner', 'Full access within their clinic'),
      (3, 'dentist',      'Clinical access — patients, treatments, notes'),
      (4, 'receptionist', 'Scheduling, billing, patient basic info'),
      (5, 'patient',      'Portal access — own records only')
    ON CONFLICT (id) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS public.roles`);
};
