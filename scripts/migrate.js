/* eslint-disable */
const { runner } = require('node-pg-migrate');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const direction = process.argv[2] || 'up';
const target = process.argv[3] || 'public'; // 'public' or 'tenant'
const schema = process.argv[4] || (target === 'tenant' ? 'tenant' : 'public');

async function migrate() {
  await runner({
    databaseUrl: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    migrationsTable: 'pgmigrations',
    migrationsSchema: target === 'tenant' ? schema : 'public',
    dir: path.join(process.cwd(), `migrations/${target}`),
    schema,
    createSchema: target === 'tenant',
    direction,
    verbose: true,
    timestamp: false,
  });
}

migrate()
  .then(() => {
    console.log(`✅ [${target}/${schema}] migrations complete`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  });
