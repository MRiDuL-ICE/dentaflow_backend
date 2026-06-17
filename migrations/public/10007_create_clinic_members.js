exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.clinic_members (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      clinic_id  UUID        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
      role_id    SMALLINT    NOT NULL REFERENCES public.roles(id),
      is_active  BOOLEAN     NOT NULL DEFAULT true,
      joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, clinic_id, role_id)
    )
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_clinic_members_user_id
    ON public.clinic_members (user_id)
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_clinic_members_clinic_id
    ON public.clinic_members (clinic_id)
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS public.clinic_members`);
};
