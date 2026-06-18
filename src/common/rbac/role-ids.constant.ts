import { AppRole } from './roles';

export const ROLE_IDS = {
  SUPER_ADMIN: 1,
  CLINIC_OWNER: 2,
  DENTIST: 3,
  RECEPTIONIST: 4,
  PATIENT: 5,
} as const;

export type RoleId = (typeof ROLE_IDS)[keyof typeof ROLE_IDS];

/**
 * Map role name -> role ID (for DB inserts, etc.)
 */
export const ROLE_NAME_TO_ID: Record<AppRole, RoleId> = {
  super_admin: ROLE_IDS.SUPER_ADMIN,
  clinic_owner: ROLE_IDS.CLINIC_OWNER,
  dentist: ROLE_IDS.DENTIST,
  receptionist: ROLE_IDS.RECEPTIONIST,
  patient: ROLE_IDS.PATIENT,
} as const;

/**
 * Map role ID -> role name (for reading from DB)
 */
export const ROLE_ID_TO_NAME: Record<RoleId, AppRole> = {
  [ROLE_IDS.SUPER_ADMIN]: 'super_admin',
  [ROLE_IDS.CLINIC_OWNER]: 'clinic_owner',
  [ROLE_IDS.DENTIST]: 'dentist',
  [ROLE_IDS.RECEPTIONIST]: 'receptionist',
  [ROLE_IDS.PATIENT]: 'patient',
} as const;

/**
 * Convert role ID to role name (type-safe)
 */
export function roleNameFromId(roleId: RoleId): AppRole {
  return ROLE_ID_TO_NAME[roleId];
}

/**
 * Convert role name to role ID
 */
export function roleIdFromName(roleName: AppRole): RoleId {
  return ROLE_NAME_TO_ID[roleName];
}
