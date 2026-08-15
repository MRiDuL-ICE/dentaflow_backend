exports.up = (pgm) => {
  // Add FK constraint on existing clinic_member_id column
  pgm.sql(`
    ALTER TABLE patients
    ADD CONSTRAINT fk_patients_clinic_member
    FOREIGN KEY (clinic_member_id)
    REFERENCES public.clinic_members(id)
    ON DELETE SET NULL
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_patients_clinic_member_id
    ON patients (clinic_member_id)
    WHERE clinic_member_id IS NOT NULL
  `);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE patients DROP CONSTRAINT IF EXISTS fk_patients_clinic_member`);
  pgm.sql(`DROP INDEX IF EXISTS idx_patients_clinic_member_id`);
};
