import * as path from 'path';

export async function runTenantMigrations(schemaName: string, databaseUrl: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { runner } = require('node-pg-migrate') as {
    runner: (opts: Record<string, unknown>) => Promise<void>;
  };

  await runner({
    databaseUrl: {
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    },
    migrationsTable: 'pgmigrations',
    migrationsSchema: schemaName,
    dir: path.join(process.cwd(), 'migrations/tenant'),
    schema: schemaName,
    createSchema: true,
    direction: 'up',
    verbose: true,
    timestamp: false,
    log: (msg: string) => console.log(`[migration:${schemaName}] ${msg}`),
  });
}
