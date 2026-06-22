export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
}
