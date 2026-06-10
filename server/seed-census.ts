import { db } from "./db";
import { populationData, provinces } from "@shared/schema";

const PNG_CENSUS_2024 = [
  { provinceName: "Western", population: 300019, growthRate: "2.80" },
  { provinceName: "Gulf", population: 203545, growthRate: "2.50" },
  { provinceName: "Central", population: 373779, growthRate: "3.10" },
  { provinceName: "National Capital District", population: 756754, growthRate: "4.20" },
  { provinceName: "Milne Bay", population: 412158, growthRate: "2.40" },
  { provinceName: "Northern", population: 273950, growthRate: "2.30" },
  { provinceName: "Southern Highlands", population: 602085, growthRate: "3.00" },
  { provinceName: "Enga", population: 489971, growthRate: "2.90" },
  { provinceName: "Western Highlands", population: 462566, growthRate: "2.70" },
  { provinceName: "Chimbu", population: 458406, growthRate: "2.60" },
  { provinceName: "Eastern Highlands", population: 800072, growthRate: "3.20" },
  { provinceName: "Hela", population: 365806, growthRate: "3.50" },
  { provinceName: "Jiwaka", population: 455208, growthRate: "3.10" },
  { provinceName: "Morobe", population: 997545, growthRate: "3.30" },
  { provinceName: "Madang", population: 761154, growthRate: "2.80" },
  { provinceName: "East Sepik", population: 631791, growthRate: "2.50" },
  { provinceName: "West Sepik", population: 362721, growthRate: "2.40" },
  { provinceName: "Manus", population: 69560, growthRate: "2.20" },
  { provinceName: "New Ireland", population: 237780, growthRate: "2.60" },
  { provinceName: "East New Britain", population: 434757, growthRate: "2.70" },
  { provinceName: "West New Britain", population: 368643, growthRate: "3.00" },
  { provinceName: "Bougainville", population: 367093, growthRate: "2.80" },
];

async function seedCensusData() {
  console.log("Fetching provinces...");
  const existingProvinces = await db.select().from(provinces);
  console.log(`Found ${existingProvinces.length} provinces`);
  
  const provinceMap = new Map(existingProvinces.map(p => [p.name.toLowerCase(), p.id]));
  
  let inserted = 0;
  for (const census of PNG_CENSUS_2024) {
    const provinceId = provinceMap.get(census.provinceName.toLowerCase());
    
    if (provinceId) {
      await db.insert(populationData).values({
        provinceId,
        source: "nso",
        year: 2024,
        totalPopulation: census.population,
        malePopulation: Math.round(census.population * 0.51),
        femalePopulation: Math.round(census.population * 0.49),
        under1Population: Math.round(census.population * 0.03),
        under5Population: Math.round(census.population * 0.14),
        pregnantWomen: Math.round(census.population * 0.032),
        growthRate: census.growthRate,
        confidenceScore: "95.00",
        approvalStatus: "approved",
      });
      inserted++;
      console.log(`Inserted census data for ${census.provinceName}`);
    } else {
      console.log(`Province not found: ${census.provinceName}`);
    }
  }
  
  console.log(`\nSeeding complete! Inserted ${inserted} census records.`);
  process.exit(0);
}

seedCensusData().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
