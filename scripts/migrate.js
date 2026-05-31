const { runner } = require('node-pg-migrate');

runner({
  databaseUrl: process.env.DATABASE_URL,
  migrationsTable: 'pgmigrations',
  dir: 'migrations/public',
  schema: 'public',
  direction: process.argv[2] || 'up',
  extension: 'js',
  ssl: { rejectUnauthorized: false },
  verbose: true,
  timestamp: false,
}).then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
