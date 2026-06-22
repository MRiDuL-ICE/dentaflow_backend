exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.clinics (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT        NOT NULL,
      slug        TEXT        UNIQUE NOT NULL,
      schema_name TEXT        UNIQUE NOT NULL,
      is_active   BOOLEAN     NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_clinics_slug
    ON public.clinics (slug)
  `);

  pgm.sql(`
    INSERT INTO public.clinics (id, name, slug, schema_name, is_active)
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      'DentaFlow Platform',
      'platform',
      'public',
      true
    )
    ON CONFLICT (id) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS public.clinics`);
};
