exports.up = (pgm) => {
  // Seed capabilities
  pgm.sql(`
    INSERT INTO public.role_permissions (role_id, resource, action) VALUES
      -- super_admin: all resources, all actions
      (1, 'patient', 'read'),
      (1, 'patient', 'write'),
      (1, 'appointment', 'read'),
      (1, 'appointment', 'write'),
      (1, 'billing', 'read'),
      (1, 'billing', 'manage'),
      (1, 'clinic', 'settings.read'),
      (1, 'clinic', 'settings.edit'),
      (1, 'user', 'manage'),
      (1, 'data', 'export'),

      -- clinic_owner
      (2, 'patient', 'read'),
      (2, 'patient', 'write'),
      (2, 'appointment', 'read'),
      (2, 'appointment', 'write'),
      (2, 'billing', 'read'),
      (2, 'billing', 'manage'),
      (2, 'clinic', 'settings.read'),
      (2, 'clinic', 'settings.edit'),
      (2, 'data', 'export'),

      -- dentist
      (3, 'patient', 'read'),
      (3, 'patient', 'write'),
      (3, 'appointment', 'read'),
      (3, 'appointment', 'write'),
      (3, 'clinic', 'settings.read'),

      -- receptionist
      (4, 'patient', 'read'),
      (4, 'appointment', 'read'),
      (4, 'appointment', 'write'),
      (4, 'billing', 'read'),
      (4, 'clinic', 'settings.read'),

      -- patient: own data only (enforced at app level)
      (5, 'patient', 'read'),
      (5, 'appointment', 'read')
    ON CONFLICT (role_id, resource, action) DO NOTHING
  `);
};
