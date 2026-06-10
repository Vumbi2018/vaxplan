import { db } from "../server/db";
import { users } from "@shared/schema";

async function run() {
  try {
    const allUsers = await db.select().from(users);
    console.log(`Total users: ${allUsers.length}`);
    for (const u of allUsers) {
      console.log(`User: ${u.email} | Role: ${u.role} | ProvinceID: ${u.provinceId} | DistrictID: ${u.districtId} | FacilityID: ${u.facilityId}`);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
