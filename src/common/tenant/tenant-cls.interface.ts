import { ClsStore } from 'nestjs-cls';

export interface TenantClsStore extends ClsStore {
  schemaName: string;
  clinicId: string;
}

export interface TenantRecord {
  id: string;
  schemaName: string;
}

export interface ClinicRow {
  id: string;
  schema_name: string;
}
