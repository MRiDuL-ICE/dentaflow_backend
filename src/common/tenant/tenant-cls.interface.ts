import { ClsStore } from 'nestjs-cls';

export interface TenantClsStore extends ClsStore {
  schemaName: string;
  clinicId: string;
}


