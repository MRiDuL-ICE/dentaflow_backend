import { SetMetadata } from '@nestjs/common';

export type AppRole = 'super_admin' | 'clinic_owner' | 'dentist' | 'receptionist' | 'patient';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
