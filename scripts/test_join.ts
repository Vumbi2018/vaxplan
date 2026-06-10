import { db } from "../server/db";
import { clients, facilities, districts, provinces, villages } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

async function run() {
  try {
    const list = await db
      .select({
        id: clients.id,
        name: clients.name,
        facilityId: clients.facilityId,
        villageId: clients.villageId,
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
      .limit(5);

    console.log("Joined query output:", JSON.stringify(list, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
