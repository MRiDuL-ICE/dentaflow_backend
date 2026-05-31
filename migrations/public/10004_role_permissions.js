exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.role_permissions (
      role_id  SMALLINT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
      resource TEXT     NOT NULL,
      action   TEXT     NOT NULL,
      PRIMARY KEY (role_id, resource, action)
    )
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS public.role_permissions`);
};
