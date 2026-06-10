import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/postgres';

const pool = new Pool({ connectionString });

async function run() {
  console.log('Updating password hashes for all existing users to enable interactive login with "password"...');
  const client = await pool.connect();
  
  try {
    // Hash corresponding to "password" with BCRYPT_ROUNDS = 12
    const defaultHash = '$2b$12$SNbOjAVQ6b8ZGurd4DU23e6zGpf6X5YTXpgyjGOaapsVa/nFcvpri';
    
    // Set the password_hash for all users where it is currently NULL or empty
    const result = await client.query(
      'UPDATE "users" SET "password_hash" = $1 WHERE "password_hash" IS NULL OR "password_hash" = \'\'',
      [defaultHash]
    );
    
    console.log(`Successfully updated ${result.rowCount} users!`);
  } catch (err) {
    console.error('Error updating password hashes:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
