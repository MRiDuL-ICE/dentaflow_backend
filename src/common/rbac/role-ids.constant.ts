export const ROLE_IDS = {
  SUPER_ADMIN: 1,
  CLINIC_OWNER: 2,
  DENTIST: 3,
  RECEPTIONIST: 4,
  PATIENT: 5,
} as const;

export type RoleId = (typeof ROLE_IDS)[keyof typeof ROLE_IDS];
