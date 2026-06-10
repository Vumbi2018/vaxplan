import { db } from "../server/db";
import { provinces } from "@shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const [p] = await db.select().from(provinces).where(eq(provinces.id, 227));
    if (p) {
      console.log(`Province 227 Name: "${p.name}" | Tenant ID: ${p.tenantId}`);
    } else {
      console.log("Province 227 not found.");
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
