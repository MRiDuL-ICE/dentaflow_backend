export type Resource = 'patient' | 'appointment' | 'billing' | 'clinic' | 'user' | 'data';

export type Action = 'read' | 'write' | 'manage' | 'export' | 'settings.read' | 'settings.edit';

/**
 * Permission string type: e.g. 'patient.read'
 */
export type Permission = `${Resource}.${Action}`;

/**
 * Constant object with all permissions for IDE autocomplete and consistency
 */
export const PERMISSIONS = {
  // Patient
  PATIENT_READ: 'patient.read' as const,
  PATIENT_WRITE: 'patient.write' as const,

  // Appointment
  APPOINTMENT_READ: 'appointment.read' as const,
  APPOINTMENT_WRITE: 'appointment.write' as const,

  // Billing
  BILLING_READ: 'billing.read' as const,
  BILLING_MANAGE: 'billing.manage' as const,

  // Clinic settings
  CLINIC_SETTINGS_READ: 'clinic.settings.read' as const,
  CLINIC_SETTINGS_EDIT: 'clinic.settings.edit' as const,

  // Data
  DATA_EXPORT: 'data.export' as const,

  // User
  USER_MANAGE: 'user.manage' as const,
} as const;

/**
 * Type for permission name keys (e.g. 'PATIENT_READ')
 */
export type PermissionName = keyof typeof PERMISSIONS;

/**
 * Type for permission values (e.g. 'patient.read')
 */
export type PermissionValue = (typeof PERMISSIONS)[PermissionName];

/**
 * All permissions as an array (useful for seeding, iteration, etc.)
 */
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);
