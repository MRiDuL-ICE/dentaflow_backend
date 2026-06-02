// eslint-disable-next-line @typescript-eslint/no-var-requires
import {runner} from 'node-pg-migrate';
import path from 'path';

export async function runTenantMigrations(
  schemaName: string,
  databaseUrl: string,
): Promise<void> {
  await runner({
    databaseUrl,
    migrationsTable: 'pgmigrations',
    dir:    path.join(process.cwd(), 'migrations/tenant'),
    schema: schemaName,
    createSchema: true,
    direction: 'up',
    log: (msg: string) => console.log(`[migration:${schemaName}] ${msg}`),
  });
}
