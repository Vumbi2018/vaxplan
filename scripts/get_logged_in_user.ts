import { db } from "../server/db";
import { sessions, users } from "@shared/schema";

async function run() {
  try {
    const allSessions = await db.select().from(sessions);
    console.log(`Active sessions in DB: ${allSessions.length}`);

    for (const sess of allSessions) {
      const parsed = sess.sess as any;
      console.log(`Session expire: ${sess.expire}`);
      console.log(`Session passport:`, parsed.passport);
      if (parsed.passport && parsed.passport.user) {
        const userId = parsed.passport.user;
        const [u] = await db.select().from(users).where(eq(users.id, userId));
        if (u) {
          console.log(`  Logged in User: ${u.email} | Role: ${u.role} | TenantID: ${u.tenantId}`);
        } else {
          console.log(`  User with ID ${userId} not found in users table!`);
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

// Helper eq import
import { eq } from "drizzle-orm";

run();
