// Placeholder — Phase 2 adds patients, appointments etc.
// This runs when a new clinic is provisioned to set up the schema.

exports.up = (pgm) => {
  // Audit log per tenant — tracks all data changes
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID        NOT NULL,
      action      TEXT        NOT NULL,
      resource    TEXT        NOT NULL,
      resource_id UUID,
      meta        JSONB,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
    ON audit_logs (user_id)
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
    ON audit_logs (resource, resource_id)
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS audit_logs`);
};
