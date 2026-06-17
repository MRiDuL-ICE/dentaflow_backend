exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.users (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT        UNIQUE NOT NULL,
      password_hash TEXT,
      first_name    TEXT        NOT NULL,
      last_name     TEXT        NOT NULL,
      is_active     BOOLEAN     NOT NULL DEFAULT true,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_users_email
    ON public.users (email)
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS public.users`);
};
