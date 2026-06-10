import { db } from "../server/db";
import { clients, facilities, districts, provinces, villages } from "../shared/schema";
import { eq, and, desc } from "drizzle-orm";

async function run() {
  try {
    console.log("Running Drizzle join query test...");
    const list = await db
      .select({
        client: clients,
        _geoProvinceId: districts.provinceId,
        _geoProvinceName: provinces.name,
        _geoDistrictId: facilities.districtId,
        _geoDistrictName: districts.name,
        _geoVillageName: villages.name,
      })
      .from(clients)
      .innerJoin(facilities, eq(facilities.id, clients.facilityId))
      .innerJoin(districts, eq(districts.id, facilities.districtId))
      .innerJoin(provinces, eq(provinces.id, districts.provinceId))
      .leftJoin(villages, eq(villages.id, clients.villageId))
      .limit(3);

    const flat = list.map(({ client, ...geo }) => ({
      ...client,
      ...geo
    }));

    console.log("Joined and flattened output:", JSON.stringify(flat, null, 2));
  } catch (err) {
    console.error("Error during join query:", err);
  }
  process.exit(0);
}

run();
