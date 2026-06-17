exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.magic_links (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID        REFERENCES public.users(id) ON DELETE CASCADE,
      email      TEXT        NOT NULL,
      token      TEXT        UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at    TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_magic_links_token
    ON public.magic_links (token)
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_magic_links_email
    ON public.magic_links (email)
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS public.magic_links`);
};
