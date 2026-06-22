/* eslint-disable */
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME ?? 'Super';
  const lastName = process.env.SUPER_ADMIN_LAST_NAME ?? 'Admin';

  if (!email || !password) {
    console.error('❌ SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD required in .env');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if super admin already exists
    const { rows: existing } = await client.query(
      `SELECT u.id FROM public.users u
       JOIN public.clinic_members cm ON cm.user_id = u.id
       WHERE u.email = $1 AND cm.role_id = 1
       LIMIT 1`,
      [email],
    );

    if (existing[0]) {
      console.log(`✅ Super admin already exists: ${email}`);
      await client.query('ROLLBACK');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const { rows: userRows } = await client.query(
      `INSERT INTO public.users
         (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [email, passwordHash, firstName, lastName],
    );

    const userId = userRows[0].id;

    // Assign super_admin role
    // super_admin has no clinic — use a special sentinel clinic_id
    // OR just insert with a NULL clinic_id
    // We need to handle this — see note below
    await client.query(
      `INSERT INTO public.clinic_members
         (user_id, clinic_id, role_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, clinic_id, role_id) DO NOTHING`,
      [userId, '00000000-0000-0000-0000-000000000000', 1],
    );

    await client.query('COMMIT');

    console.log(`✅ Super admin created: ${email}`);
    console.log(`   User ID: ${userId}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedSuperAdmin();
