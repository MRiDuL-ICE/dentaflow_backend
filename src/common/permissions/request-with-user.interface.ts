import { type AppRole } from '../rbac/roles';
import { Permission } from './permissions';

export interface RequestWithUser {
  user: {
    id: string;
    email?: string;
    roles: AppRole[];
    permissions: Permission[];
    clinicId: string;
  };
}
