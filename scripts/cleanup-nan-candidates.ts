import pg from 'pg';
import { db, pool } from '../server/db';
import { candidateUnmappedSettlements } from '../shared/schema';
import { eq, or } from 'drizzle-orm';

async function run() {
  console.log('Cleaning up NaN candidate unmapped settlements...');
  try {
    const res = await db
      .delete(candidateUnmappedSettlements)
      .where(
        or(
          eq(candidateUnmappedSettlements.latitude, 'NaN'),
          eq(candidateUnmappedSettlements.longitude, 'NaN')
        )
      );
    console.log('Cleaned up successfully!');
  } catch (err: any) {
    console.error('Cleanup failed:', err.message);
  } finally {
    await pool.end();
  }
}

run();
