// src/auth/permissions/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { type Permission } from './permissions';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions.
 * Usage: @RequirePermissions(PERMISSIONS.PATIENT_READ, PERMISSIONS.APPOINTMENT_WRITE)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
