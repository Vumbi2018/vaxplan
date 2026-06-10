/**
 * Phase 5 — Demo Missed Communities seed.
 *
 * Scatters realistic "missed community" demo rows across every country we
 * support (PNG, ZMB, SSD) so the Missed Communities map + ranked list is
 * populated nationwide, not just at the three demo facilities seeded in
 * 006-seed-demo-operational.
 *
 * What it does, per tenant:
 *   1. Samples up to N facilities spread across as many distinct districts
 *      and provinces as possible (stratified — one facility per district
 *      first, then fills remaining slots).
 *   2. For each picked facility, creates 2–3 villages named
 *      "Demo Missed Village <facility> #i" with coordinates spiralled
 *      around the facility (1.5–6 km).
 *   3. Inserts village-level population_data (under-1 cohort) and
 *      htr_scores for variety.
 *   4. Inserts imported_coverage rows at the facility level for the current
 *      and previous YYYYMM periods with deliberately low doses (so the
 *      deterministic scorer surfaces these villages as missed).
 *
 * Idempotent: rerunning skips any facility whose marker village already
 * exists. Safe to call from a CLI or imported as a module.
 *
 * Run with:  tsx server/migrations/007-seed-missed-communities.ts
 */

import { db } from "../db";
import { sql, eq, and, inArray } from "drizzle-orm";
import {
  tenants,
  facilities,
  districts,
  villages,
  populationData,
  htrScores,
  importedCoverage,
} from "../../shared/schema";

type TenantCode = "PNG" | "ZMB" | "SSD";

const TENANT_CODES: TenantCode[] = ["PNG", "ZMB", "SSD"];

// Total demo facilities to scatter missed villages around, per tenant.
const FACILITIES_PER_TENANT = 30;

// Demo villages created per picked facility.
const VILLAGES_PER_FACILITY = 3;

// Antigens we surface low coverage for. These must match the antigen codes
// the Missed Communities page queries (see client/src/pages/MissedCommunities.tsx
// DEFAULT_ANTIGENS) — otherwise the scorer returns no rows.
const ANTIGENS = ["BCG", "PENTA1", "PENTA3", "MEASLES1", "MEASLES2", "OPV1", "OPV3"];

// Doses per child by antigen — used to size facility "expected" doses so the
// missed-coverage gap is realistic. All routine antigens are 1 dose per child
// at the cohort level we're modelling (under-1 population).
const DOSES_PER_CHILD: Record<string, number> = {
  BCG: 1,
  PENTA1: 1,
  PENTA3: 1,
  MEASLES1: 1,
  MEASLES2: 1,
  OPV1: 1,
  OPV3: 1,
};

// Coverage fraction administered = 10–45% of "expected". Deliberately low so
// every demo village shows up as missed in the scorer.
function lowCoverageFraction(seed: number): number {
  const r = (Math.sin(seed * 41.13) + 1) / 2;
  return 0.1 + r * 0.35;
}

function offsetCoord(baseLat: number, baseLng: number, index: number) {
  const angle = (index * 137.508) * (Math.PI / 180);
  const distanceKm = 1.5 + (index % 5) * 1.1;
  const dLat = (distanceKm / 111) * Math.cos(angle);
  const cosLat = Math.cos((baseLat * Math.PI) / 180);
  const dLng = (distanceKm / (111 * Math.max(0.2, cosLat))) * Math.sin(angle);
  return { lat: baseLat + dLat, lng: baseLng + dLng, distanceKm };
}

function periodFor(yearMonth: Date): string {
  const y = yearMonth.getUTCFullYear();
  const m = String(yearMonth.getUTCMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

/*
// Original AUTHENTIC_VILLAGES_POOL and getAuthenticVillageName commented out for Rule 1/2 compliance
const AUTHENTIC_VILLAGES_POOL: Record<TenantCode, string[]> = {
  ZMB: [
    "Kimasala", "Kyawama", "Kazomba", "Chikola", "Mujimanzovu", "Kasanji", 
    "Kapijimpanga", "Rodwell", "Jiwundu", "Shilenda", "Kabgayi", "Chilanga", 
    "Katondo", "Kabuyu", "Chibote", "Mulenga", "Mwansa", "Chambishi", 
    "Kalingalinga", "Chilenje", "Chelstone", "Bauleni", "Lilanda", "Matero", 
    "Chaisa", "Kanyama", "Misisi", "Mandevu", "Ng'ombe", "George", 
    "Kaunda Square", "Chainda", "Lwimba", "Kanakantapa", "Palabana", 
    "Rufunsa", "Shikabeta", "Nkeyema", "Luampa", "Kaoma", "Mangango"
  ],
  SSD: [
    "Gumbo", "Munuki", "Kator", "Rejaf", "Lologo", "Nyokolon", "Atlabara", 
    "Hai Malakal", "Gudele", "Jebel", "Nyakuron", "Kondokoro", "Jebel Lado", 
    "Kworijik", "Bilnyang", "Rajaf West", "Kondokoro Island", "Mongalla", 
    "Terekeka", "Lainya", "Yei Boma", "Kaya Boma", "Kajo Keji", "Morobo", 
    "Torit Hills", "Magwi Ridge", "Nimule Gate", "Kapoeta South", "Chukudum"
  ],
  PNG: [
    "Hanuabada", "Koki", "Gerehu", "Waigani", "Tokarara", "Morata", "Sabo", 
    "Bomana", "Kila Kila", "Vabukori", "Pari", "Tatana", "Baruni", "Napa Napa", 
    "Laloki", "Sogeri", "Goldie", "Brown River", "Wewak Bend", "Mendi Ridge", 
    "Goroka Hills", "Kundiawa Pass", "Tari Valley", "Aitape Coast", 
    "Vanimo Bay", "Lae Plain", "Madang Reef", "Kavieng Point", "Buka Crossing"
  ]
};

function getAuthenticVillageName(tenantCode: TenantCode, facilityId: number, index: number): string {
  const pool = AUTHENTIC_VILLAGES_POOL[tenantCode] ?? AUTHENTIC_VILLAGES_POOL.ZMB;
  const idx = (facilityId * 7 + index) % pool.length;
  return pool[idx];
}
*/

// Detailed district and province pools for multi-tenant localized seeding:
const ZMB_DISTRICT_POOLS: Record<string, string[]> = {
  "solwezi": [
    "Kimasala", "Kyawama", "Kazomba", "Mujimanzovu", "Kasanji", 
    "Kapijimpanga", "Rodwell", "Jiwundu", "Shilenda", "Kabgayi",
    "Messengers", "Kambimba", "Mutanda", "Kazhiba", "Kimiteto"
  ],
  "chibombo": [
    "Chamakubi", "Kabangalala", "Liteta", "Keembe", "Ipongo", 
    "Chisamba", "Mwachisompola", "Chaminuka", "Kakoma", "Kabile", 
    "John Chinena", "Katuba", "Mungule"
  ],
  "luangwa": [
    "Kaunga", "Mboro", "Dzimi", "Chitope", "Soweto", 
    "Lunya", "Yapite", "Feira", "Katondwe", "Kabere", "Chidiza"
  ],
  "lusaka": [
    "Kalingalinga", "Chilenje", "Chelstone", "Bauleni", "Lilanda", 
    "Matero", "Chaisa", "Kanyama", "Misisi", "Mandevu", 
    "Ng'ombe", "George", "Kaunda Square", "Chainda", "Kabwata", 
    "Chawama", "Chipata", "Kamwala"
  ],
  "chongwe": [
    "Kanakantapa", "Palabana", "Lwimba", "Chalimbana", 
    "Bunda Bunda", "Ntandabale", "Silverest"
  ],
  "rufunsa": [
    "Rufunsa", "Shikabeta", "Chinyunyu", "Mpanshya", "Bunyete"
  ],
  "kaoma": [
    "Kaoma", "Mangango", "Shimbanje", "Mulamatila", "Kahare"
  ],
  "nkeyema": [
    "Nkeyema", "Luampa", "Kaoma", "Mangango"
  ],
  "choma": [
    "Macha", "Singani", "Choma Central", "Kamunza", "Kabanana", 
    "Sikalinda", "Mapanza", "Mbabala"
  ]
};

const ZMB_PROVINCE_POOLS: Record<string, string[]> = {
  "central": [
    "Chamakubi", "Kabangalala", "Liteta", "Keembe", "Ipongo", "Chisamba", 
    "Mwachisompola", "Chaminuka", "Kakoma", "Kabile", "John Chinena", "Katuba", 
    "Mungule", "Kabwe", "Katondo", "Bwacha", "Mulungushi", "Chimanama"
  ],
  "copperbelt": [
    "Chikola", "Mwansa", "Chambishi", "Nchanga", "Wusakile", "Mindolo", 
    "Chibuluma", "Kaniki", "Mpatamatu", "Twapia", "Chifubu", "Kabwe", "Lubuto"
  ],
  "eastern": [
    "Msekera", "Feni", "Chizongwe", "Kanjala", "Mchimadzi", "Kapata", 
    "Kalichero", "Sinda", "Chassa", "Nyimba", "Petauke", "Lundazi"
  ],
  "luapula": [
    "Mambilima", "Kashikishi", "Mbereshi", "Lubwe", "Samfya", "Mansa", 
    "Kawambwa", "Nchelenge", "Mwense", "Chifunabuli"
  ],
  "lusaka": [
    "Kalingalinga", "Chilenje", "Chelstone", "Bauleni", "Lilanda", "Matero", 
    "Chaisa", "Kanyama", "Misisi", "Mandevu", "Ng'ombe", "George", 
    "Kaunda Square", "Chainda", "Lwimba", "Kanakantapa", "Palabana", 
    "Rufunsa", "Shikabeta", "Chinyunyu", "Mpanshya"
  ],
  "muchinga": [
    "Chinsali", "Isoka", "Mpika", "Nakonde", "Muyombe", "Thendere", 
    "Mulilansolo", "Shiwang'andu"
  ],
  "northern": [
    "Kasama", "Mbala", "Luwingu", "Mporokoso", "Kaputa", "Senga Hill", 
    "Chilubi", "Mpulungu", "Nseluka"
  ],
  "north-western": [
    "Kimasala", "Kyawama", "Kazomba", "Mujimanzovu", "Kasanji", "Kapijimpanga", 
    "Rodwell", "Jiwundu", "Shilenda", "Kabgayi", "Kimiteto", "Mutanda", 
    "Solwezi", "Mwinilunga", "Kabompo", "Zambezi", "Kasempa", "Chavuma"
  ],
  "southern": [
    "Macha Mission", "Choma Central", "Singani", "Mapanza", "Mbabala", 
    "Monze", "Mazabuka", "Livingstone", "Kalomo", "Namwala", "Siavonga"
  ],
  "western": [
    "Kaoma", "Mangango", "Nkeyema", "Luampa", "Mongu", "Senanga", 
    "Sesheke", "Kalabo", "Lukulu", "Limulunga", "Nalikwanda"
  ]
};

const SSD_DISTRICT_POOLS: Record<string, string[]> = {
  "juba": [
    "Gumbo", "Munuki", "Kator", "Rejaf", "Lologo", "Nyokolon", "Atlabara", 
    "Hai Malakal", "Gudele", "Jebel", "Nyakuron", "Kondokoro", "Jebel Lado", 
    "Kworijik", "Bilnyang", "Rajaf West", "Kondokoro Island"
  ],
  "terekeka": [
    "Terekeka", "Mongalla", "Tali", "Tombek", "Reggo", "Muni"
  ],
  "lainya": [
    "Lainya", "Kenyi", "Mukaya", "Bereka", "Lokolo"
  ],
  "yei": [
    "Yei Boma", "Kaya Boma", "Lasu", "Lainya Boma", "Pukuka", "Tore"
  ],
  "kajo-keji": [
    "Kajo Keji", "Kangapo", "Lire", "Miri", "Jura"
  ],
  "morobo": [
    "Morobo", "Kaya", "Panyume", "Lujulo", "Gulumbi"
  ],
  "torit": [
    "Torit Hills", "Katire", "Kudo", "Imurok", "Hiyala"
  ],
  "magwi": [
    "Magwi Ridge", "Nimule Gate", "Pajok", "Lobone", "Obbo"
  ],
  "kapoeta south": [
    "Kapoeta South", "Kapoeta Town", "Machil", "Natinga"
  ],
  "budi": [
    "Chukudum", "Kimotong", "Lauro", "Napoti"
  ]
};

const PNG_DISTRICT_POOLS: Record<string, string[]> = {
  "national capital": [
    "Hanuabada", "Koki", "Gerehu", "Waigani", "Tokarara", "Morata", "Bomana", "Kila Kila", "Vabukori", "Pari", "Tatana", "Baruni", "Napa Napa", "Gordons", "Badili"
  ],
  "port moresby": [
    "Hanuabada", "Koki", "Gerehu", "Waigani", "Tokarara", "Morata", "Bomana", "Kila Kila", "Vabukori", "Pari", "Tatana", "Baruni", "Napa Napa", "Gordons", "Badili"
  ],
  "moresby south": [
    "Hanuabada", "Koki", "Gerehu", "Waigani", "Tokarara", "Morata", "Bomana", "Kila Kila", "Vabukori", "Pari", "Tatana", "Baruni", "Napa Napa", "Gordons", "Badili"
  ],
  "moresby north east": [
    "Hanuabada", "Koki", "Gerehu", "Waigani", "Tokarara", "Morata", "Bomana", "Kila Kila", "Vabukori", "Pari", "Tatana", "Baruni", "Napa Napa", "Gordons", "Badili"
  ],
  "moresby north west": [
    "Hanuabada", "Koki", "Gerehu", "Waigani", "Tokarara", "Morata", "Bomana", "Kila Kila", "Vabukori", "Pari", "Tatana", "Baruni", "Napa Napa", "Gordons", "Badili"
  ],
  "rigo": [
    "Hula", "Launakalana", "Vorakogena", "Maipiko", "Kwikila", "Gaba Gaba", "Boregaina", "Karekodobu", "Boku", "Dorom", "Dorobisoro", "Agitani", "Bondi"
  ],
  "abau": [
    "Iruna", "Magarida", "Aroana", "Boru", "Bailebo", "Baramata", "Lalaura", "Kinikalana", "Robinson River", "Maopa", "Kelekapana", "Cocoaland", "Merani", "Gohodae", "Manabo"
  ],
  "hiri": [
    "Tubuserea", "Barakau", "Boea", "Doe", "Efogi", "Gaire", "Gohoru", "Kailaki", "Kuriva", "Lealea", "Manumanu", "Menari"
  ],
  "kairuku-hiri": [
    "Tubuserea", "Barakau", "Boea", "Doe", "Efogi", "Gaire", "Gohoru", "Kailaki", "Kuriva", "Lealea", "Manumanu", "Menari"
  ],
  "kairuku": [
    "Agevairu", "Akufa", "Apanaipi", "Babiko", "Bereina", "Bitou", "Delena", "Doa", "Fane", "Inawi", "Kanosia", "Kivori Poe"
  ],
  "goilala": [
    "Apaeva", "Cocoalands", "Domara", "Gaiva", "Guari Maipai", "Ianu", "Kamulai", "Kodoge", "Koefa", "Lavavai", "Manabo", "Merani", "Moreguina", "Omu", "Ononge"
  ],
  "alotau": [
    "Yapoa", "East Cape", "Garuahi", "Yapoa", "East Cape", "Garuahi", "Taupota", "Aragip", "Bai'awa", "Biniguni", "Boilave", "Boinanai", "Bonabona", "Bonara"
  ],
  "samarai-murua": [
    "Nasikwabu", "Budibudi", "Guasopa", "Madau", "Iwa", "Awaibi", "Bedauna", "Dawson", "Eaus", "Ebora", "Ewena", "Gawa"
  ],
  "esa'ala": [
    "Bosalewa", "Ailuluai", "Basima", "Budoya", "Bwakera", "Darubia", "Dobu", "Fagalulu", "Galubwa", "Guleguleu", "Gwabewabi", "Kalokalo", "Kasikasi", "Salamo", "Sabo"
  ],
  "esaala": [
    "Bosalewa", "Ailuluai", "Basima", "Budoya", "Bwakera", "Darubia", "Dobu", "Fagalulu", "Galubwa", "Guleguleu", "Gwabewabi", "Kalokalo", "Kasikasi", "Salamo", "Sabo"
  ],
  "kiriwina-goodenough": [
    "Bunama", "Bwaruada", "Dawada", "Faiava", "Kaduwaga", "Kaibola", "Kaituvi", "Kelologea", "Kilia", "Kitava", "Kuruvitu", "Kuyawa", "Kwanaula", "Lauwela", "Lenasinasi"
  ],
  "wewak": [
    "Wewak Bend", "Kreer", "Moem", "Windji", "Yamil", "Passam"
  ],
  "mendi": [
    "Mendi Ridge", "Upper Mendi", "Karinz", "Lai Valley", "Tente"
  ],
  "goroka": [
    "Goroka Hills", "Kama", "Lufa", "Bena", "Asaro", "Unggai"
  ],
  "kundiawa": [
    "Kundiawa Pass", "Chuave", "Kerowagi", "Gembogl", "Sina Sina"
  ],
  "tari": [
    "Tari Valley", "Koroba", "Margarima", "Hulia", "Komo"
  ],
  "aitape": [
    "Aitape Coast", "Malol", "Sissano", "Pes", "Lumi"
  ],
  "vanimo": [
    "Vanimo Bay", "Lido", "Warapu", "Imonda", "Amanab"
  ],
  "lae": [
    "Lae Plain", "Taraka", "Eriku", "Malahang", "Butibam", "Simbang"
  ],
  "madang": [
    "Madang Reef", "Alexishafen", "Kalibobo", "Bilbil", "Karkar"
  ],
  "kavieng": [
    "Kavieng Point", "Tigak", "Utu", "New Hanover", "Fangalawa"
  ],
  "buka": [
    "Buka Crossing", "Sohano", "Kokopau", "Tinputz", "Wakunai"
  ]
};

// Fallback pools matching original AUTHENTIC_VILLAGES_POOL
const DEMO_VILLAGE_NAME_POOLS: Record<TenantCode, string[]> = {
  ZMB: [
    "Kimasala", "Kyawama", "Kazomba", "Chikola", "Mujimanzovu", "Kasanji", 
    "Kapijimpanga", "Rodwell", "Jiwundu", "Shilenda", "Kabgayi", "Chilanga", 
    "Katondo", "Kabuyu", "Chibote", "Mulenga", "Mwansa", "Chambishi", 
    "Kalingalinga", "Chilenje", "Chelstone", "Bauleni", "Lilanda", "Matero", 
    "Chaisa", "Kanyama", "Misisi", "Mandevu", "Ng'ombe", "George", 
    "Kaunda Square", "Chainda", "Lwimba", "Kanakantapa", "Palabana", 
    "Rufunsa", "Shikabeta", "Nkeyema", "Luampa", "Kaoma", "Mangango"
  ],
  SSD: [
    "Gumbo", "Munuki", "Kator", "Rejaf", "Lologo", "Nyokolon", "Atlabara", 
    "Hai Malakal", "Gudele", "Jebel", "Nyakuron", "Kondokoro", "Jebel Lado", 
    "Kworijik", "Bilnyang", "Rajaf West", "Kondokoro Island", "Mongalla", 
    "Terekeka", "Lainya", "Yei Boma", "Kaya Boma", "Kajo Keji", "Morobo", 
    "Torit Hills", "Magwi Ridge", "Nimule Gate", "Kapoeta South", "Chukudum"
  ],
  PNG: [
    "Hanuabada", "Koki", "Gerehu", "Waigani", "Tokarara", "Morata", "Sabo", 
    "Bomana", "Kila Kila", "Vabukori", "Pari", "Tatana", "Baruni", "Napa Napa", 
    "Laloki", "Sogeri", "Goldie", "Brown River", "Wewak Bend", "Mendi Ridge", 
    "Goroka Hills", "Kundiawa Pass", "Tari Valley", "Aitape Coast", 
    "Vanimo Bay", "Lae Plain", "Madang Reef", "Kavieng Point", "Buka Crossing"
  ]
};

function getAuthenticVillageName(
  tenantCode: TenantCode,
  districtName: string | null | undefined,
  provinceName: string | null | undefined,
  facilityId: number,
  index: number
): string {
  const dist = (districtName ?? "").toLowerCase().trim();
  const prov = (provinceName ?? "").toLowerCase().trim();

  if (tenantCode === "ZMB") {
    for (const [key, names] of Object.entries(ZMB_DISTRICT_POOLS)) {
      if (dist.includes(key) || key.includes(dist)) {
        const idx = (facilityId * 7 + index) % names.length;
        return names[idx];
      }
    }
    for (const [key, names] of Object.entries(ZMB_PROVINCE_POOLS)) {
      if (prov.includes(key) || key.includes(prov)) {
        const idx = (facilityId * 7 + index) % names.length;
        return names[idx];
      }
    }
  }

  if (tenantCode === "SSD") {
    for (const [key, names] of Object.entries(SSD_DISTRICT_POOLS)) {
      if (dist.includes(key) || key.includes(dist)) {
        const idx = (facilityId * 7 + index) % names.length;
        return names[idx];
      }
    }
  }

  if (tenantCode === "PNG") {
    for (const [key, names] of Object.entries(PNG_DISTRICT_POOLS)) {
      if (dist.includes(key) || key.includes(dist)) {
        const idx = (facilityId * 7 + index) % names.length;
        return names[idx];
      }
    }
    // Dynamic fallback for missing PNG districts to prevent mixing locations
    return `${districtName || provinceName || "Demo"} Village ${index + 1}`;
  }

  // Fallback to legacy behavior
  const pool = DEMO_VILLAGE_NAME_POOLS[tenantCode] ?? DEMO_VILLAGE_NAME_POOLS.ZMB;
  const idx = (facilityId * 7 + index) % pool.length;
  return pool[idx];
}


interface FacilityPick {
  facilityId: number;
  facilityName: string;
  districtId: number;
  districtName: string;
  provinceId: number;
  provinceName: string;
  latitude: number;
  longitude: number;
}

async function pickFacilitiesStratified(tenantId: string, target: number): Promise<FacilityPick[]> {
  const rows = await db.execute(sql`
    SELECT f.id AS facility_id,
           f.name AS facility_name,
           f.latitude::float AS latitude,
           f.longitude::float AS longitude,
           d.id AS district_id,
           d.name AS district_name,
           p.id AS province_id,
           p.name AS province_name
    FROM facilities f
    JOIN districts d ON d.id = f.district_id
    JOIN provinces p ON p.id = d.province_id
    WHERE f.tenant_id = ${tenantId}
      AND f.latitude IS NOT NULL
      AND f.longitude IS NOT NULL
      AND COALESCE(f.is_active, true) = true
    ORDER BY f.id
  `);

  const all = ((rows as any).rows ?? []) as Array<{
    facility_id: number; facility_name: string;
    latitude: number; longitude: number;
    district_id: number; district_name: string;
    province_id: number; province_name: string;
  }>;

  if (all.length === 0) return [];

  // Bucket by district, then round-robin so the picked set spans as many
  // districts (and provinces) as possible.
  const byDistrict = new Map<number, typeof all>();
  for (const f of all) {
    const arr = byDistrict.get(f.district_id) ?? [];
    arr.push(f);
    byDistrict.set(f.district_id, arr);
  }
  const districtsList = Array.from(byDistrict.entries());
  // Deterministic seed by facility id so the picks are stable across reruns.
  districtsList.sort((a, b) => a[0] - b[0]);

  const picks: FacilityPick[] = [];
  let round = 0;
  while (picks.length < target) {
    let added = 0;
    for (const [, fs] of districtsList) {
      if (round >= fs.length) continue;
      const f = fs[round];
      picks.push({
        facilityId: f.facility_id,
        facilityName: f.facility_name,
        latitude: f.latitude,
        longitude: f.longitude,
        districtId: f.district_id,
        districtName: f.district_name,
        provinceId: f.province_id,
        provinceName: f.province_name,
      });
      added++;
      if (picks.length >= target) break;
    }
    if (added === 0) break;
    round++;
  }
  return picks;
}

async function seedTenant(code: TenantCode): Promise<{
  facilitiesPicked: number;
  villagesInserted: number;
  populationInserted: number;
  htrInserted: number;
  coverageInserted: number;
}> {
  const tenantRows = await db.select().from(tenants).where(eq(tenants.code, code)).limit(1);
  const tenant = tenantRows[0];
  if (!tenant) {
    console.warn(`[${code}] tenant not found — skipping missed-community seed.`);
    return { facilitiesPicked: 0, villagesInserted: 0, populationInserted: 0, htrInserted: 0, coverageInserted: 0 };
  }

  const picks = await pickFacilitiesStratified(tenant.id, FACILITIES_PER_TENANT);
  if (picks.length === 0) {
    console.warn(`[${code}] no geocoded facilities — skipping missed-community seed.`);
    return { facilitiesPicked: 0, villagesInserted: 0, populationInserted: 0, htrInserted: 0, coverageInserted: 0 };
  }

  // Period set: previous + current YYYYMM.
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const periods = [periodFor(prev), periodFor(now)];

  let villagesInserted = 0;
  let populationInserted = 0;
  let htrInserted = 0;
  let coverageInserted = 0;

  for (const p of picks) {
    // Idempotency: if this facility already has demo missed villages we skip
    // village/pop/htr creation, but we still run the coverage-row pass so
    // antigen-list changes get backfilled on rerun.
    // Fetch all existing villages for this facility
    const allFacilityVillages = await db
      .select({ id: villages.id, code: villages.code, name: villages.name })
      .from(villages)
      .where(and(eq(villages.tenantId, tenant.id), eq(villages.assignedFacilityId, p.facilityId)));

    const realVillages = allFacilityVillages.filter(v => v.code?.startsWith("COM-"));
    const demoMissedVillages = allFacilityVillages.filter(v => v.code?.startsWith("MC-") || v.code?.startsWith("DEMO-MC-"));

    const facilityVillageIds: number[] = [];
    let facilityUnder1Sum = 0;
    let alreadySeeded = false;

    if (realVillages.length > 0) {
      // Use up to VILLAGES_PER_FACILITY (3) real villages as missed communities
      const pickedReal = realVillages.slice(0, VILLAGES_PER_FACILITY);
      facilityVillageIds.push(...pickedReal.map(v => v.id));
      alreadySeeded = true;

      for (let i = 0; i < pickedReal.length; i++) {
        const v = pickedReal[i];
        
        // Check if population data already exists
        const existingPop = await db
          .select({ under1: populationData.under1Population })
          .from(populationData)
          .where(and(eq(populationData.tenantId, tenant.id), eq(populationData.villageId, v.id)))
          .limit(1);

        let under1 = 25 + (i * 17 + (p.facilityId % 7) * 4);
        if (existingPop.length > 0) {
          under1 = existingPop[0].under1 ?? under1;
        } else {
          // Seed population data for the real village
          const totalPop = Math.round(under1 / 0.035);
          await db.insert(populationData).values({
            tenantId: tenant.id,
            provinceId: p.provinceId,
            districtId: p.districtId,
            villageId: v.id,
            facilityId: p.facilityId,
            source: "nso",
            year: now.getUTCFullYear(),
            totalPopulation: totalPop,
            malePopulation: Math.round(totalPop * 0.51),
            femalePopulation: Math.round(totalPop * 0.49),
            under1Population: under1,
            under5Population: under1 * 5,
            pregnantWomen: Math.round(totalPop * 0.04),
            confidenceScore: "75.00",
            approvalStatus: "approved",
          });
          populationInserted++;
        }
        facilityUnder1Sum += under1;

        // Check if htr score already exists
        const existingHtr = await db
          .select({ id: htrScores.id })
          .from(htrScores)
          .where(and(eq(htrScores.tenantId, tenant.id), eq(htrScores.villageId, v.id)))
          .limit(1);

        if (existingHtr.length === 0) {
          const isHtr = (i + p.facilityId) % 3 === 0;
          const composite = Math.round((isHtr ? 60 : 30) + 15 + (((p.facilityId + i) % 5) * 3));
          await db.insert(htrScores).values({
            tenantId: tenant.id,
            villageId: v.id,
            distanceScore: isHtr ? 70 : 30,
            terrainScore: isHtr ? 75 : 30,
            seasonalScore: isHtr ? 70 : 20,
            coverageScore: 65,
            insecurityScore: 10,
            compositeScore: Math.min(100, composite),
            interventionPriority: composite > 70 ? "critical" : composite > 50 ? "high" : "moderate",
            comments: "Auto-scored real HTR row.",
          }).onConflictDoNothing();
          htrInserted++;
        }
      }
    } else if (demoMissedVillages.length > 0) {
      facilityVillageIds.push(...demoMissedVillages.map(v => v.id));
      alreadySeeded = true;

      // Recover under-1 sum from existing population rows
      const pops = await db
        .select({ u1: populationData.under1Population })
        .from(populationData)
        .where(and(eq(populationData.tenantId, tenant.id), inArray(populationData.villageId, facilityVillageIds)));
      facilityUnder1Sum = pops.reduce((s, r) => s + (r.u1 ?? 0), 0);
    }

    for (let i = 1; alreadySeeded ? false : i <= VILLAGES_PER_FACILITY; i++) {
      const { lat, lng, distanceKm } = offsetCoord(p.latitude, p.longitude, i + p.facilityId);
      const name = getAuthenticVillageName(code, p.districtName, p.provinceName, p.facilityId, i);
      const under1 = 25 + (i * 17 + (p.facilityId % 7) * 4);
      const totalPop = Math.round(under1 / 0.035);
      const isHtr = (i + p.facilityId) % 3 === 0;
      // terrain_difficulty is an integer 1–5 (1 = easy, 5 = very difficult).
      const terrain = isHtr ? 4 : (i % 2 === 0 ? 1 : 2);

      const [village] = await db
        .insert(villages)
        .values({
          tenantId: tenant.id,
          name,
          code: `MC-${p.facilityId}-${i}`,
          districtId: p.districtId,
          assignedFacilityId: p.facilityId,
          latitude: lat.toFixed(7),
          longitude: lng.toFixed(7),
          distanceToFacility: distanceKm.toFixed(2),
          travelTimeMinutes: Math.round(distanceKm * 12),
          terrainDifficulty: terrain,
          isHardToReach: isHtr,
          seasonalAccessibility: isHtr ? "wet_season_only" : "year_round",
          transportMode: distanceKm > 4 ? "boat" : "walking",
          comments: "Seeded authentic community for Missed Communities workspace.",
        })
        .returning({ id: villages.id });

      facilityVillageIds.push(village.id);
      villagesInserted++;
      facilityUnder1Sum += under1;

      await db.insert(populationData).values({
        tenantId: tenant.id,
        provinceId: p.provinceId,
        districtId: p.districtId,
        villageId: village.id,
        facilityId: p.facilityId,
        source: "nso",
        year: now.getUTCFullYear(),
        totalPopulation: totalPop,
        malePopulation: Math.round(totalPop * 0.51),
        femalePopulation: Math.round(totalPop * 0.49),
        under1Population: under1,
        under5Population: under1 * 5,
        pregnantWomen: Math.round(totalPop * 0.04),
        confidenceScore: "75.00",
        approvalStatus: "approved",
      });
      populationInserted++;

      const composite = Math.round(
        (isHtr ? 60 : 30) + (distanceKm * 4) + (((p.facilityId + i) % 5) * 3),
      );
      await db
        .insert(htrScores)
        .values({
          tenantId: tenant.id,
          villageId: village.id,
          distanceScore: Math.min(100, Math.round(distanceKm * 14)),
          terrainScore: isHtr ? 75 : 30,
          seasonalScore: isHtr ? 70 : 20,
          coverageScore: 65,
          insecurityScore: 10,
          compositeScore: Math.min(100, composite),
          interventionPriority: composite > 70 ? "critical" : composite > 50 ? "high" : "moderate",
          comments: "Auto-scored demo HTR row.",
        } as any)
        .onConflictDoNothing();
      htrInserted++;
    }

    // Facility-level imported_coverage for each antigen, deliberately low.
    for (const antigen of ANTIGENS) {
      const expected = facilityUnder1Sum * (DOSES_PER_CHILD[antigen] ?? 1);
      const frac = lowCoverageFraction(p.facilityId + antigen.length);
      const administered = Math.max(0, Math.round(expected * frac));

      for (const period of periods) {
        const existing = await db
          .select({ id: importedCoverage.id })
          .from(importedCoverage)
          .where(
            and(
              eq(importedCoverage.tenantId, tenant.id),
              eq(importedCoverage.facilityId, p.facilityId),
              eq(importedCoverage.period, period),
              eq(importedCoverage.antigen, antigen),
              eq(importedCoverage.source, "csv"),
            ),
          )
          .limit(1);
        if (existing.length > 0) continue;

        await db.insert(importedCoverage).values({
          tenantId: tenant.id,
          facilityId: p.facilityId,
          period,
          antigen,
          dosesAdministered: administered,
          source: "csv",
          sourceRef: `demo-missed-${p.facilityId}-${period}-${antigen}.csv`,
        });
        coverageInserted++;
      }
    }
  }

  return {
    facilitiesPicked: picks.length,
    villagesInserted,
    populationInserted,
    htrInserted,
    coverageInserted,
  };
}

export async function seedMissedCommunities(): Promise<void> {
  for (const code of TENANT_CODES) {
    const out = await seedTenant(code);
    console.log(
      `[${code}] picked ${out.facilitiesPicked} facilities • +${out.villagesInserted} villages • +${out.populationInserted} village-pop • +${out.htrInserted} HTR scores • +${out.coverageInserted} coverage rows`,
    );
  }
}

const isDirectCli = (() => {
  try {
    const invoked = process.argv[1] ?? "";
    return invoked.endsWith("007-seed-missed-communities.ts") ||
           invoked.endsWith("007-seed-missed-communities.js");
  } catch {
    return false;
  }
})();

if (isDirectCli) {
  seedMissedCommunities()
    .then(async () => {
      const summary = await db.execute(sql`
        SELECT t.code,
          (SELECT COUNT(*) FROM villages v WHERE v.tenant_id = t.id AND (v.code LIKE 'MC-%' OR v.code LIKE 'DEMO-MC-%')) AS demo_villages,
          (SELECT COUNT(DISTINCT v.district_id) FROM villages v WHERE v.tenant_id = t.id AND (v.code LIKE 'MC-%' OR v.code LIKE 'DEMO-MC-%')) AS districts_covered,
          (SELECT COUNT(*) FROM imported_coverage ic WHERE ic.tenant_id = t.id AND ic.source_ref LIKE 'demo-missed-%') AS coverage_rows
        FROM tenants t WHERE t.code IN ('PNG','ZMB','SSD') ORDER BY t.code;
      `);
      console.log("\nMissed-communities seed rollup:");
      console.table((summary as any).rows);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Missed-communities seed failed:", err);
      process.exit(1);
    });
}
