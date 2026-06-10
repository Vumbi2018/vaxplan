import { storage } from "../server/storage";

async function run() {
  try {
    const tenantId = "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06";
    const vils = await storage.getVillages(tenantId);
    console.log(`storage.getVillages length: ${vils.length}`);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
