exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.refresh_tokens (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      token      TEXT        UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
    ON public.refresh_tokens (token)
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
    ON public.refresh_tokens (user_id)
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS public.refresh_tokens`);
};
