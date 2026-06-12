/**
 * seed-demo-data.cjs
 * Seeds dummy staff members and cold-chain equipment across 12 facilities
 * spanning different districts/provinces and 3 country tenants.
 *
 * Run with: node scripts/seed-demo-data.cjs
 */

const { Pool } = require("pg");

const DB_URL = "postgresql://postgres:postgres@localhost:5432/vaxplan";

// ─── Target Facilities (real IDs from the database) ──────────────────────────
const TARGET_FACILITIES = [
  { id: 21141, name: "Waya Rural Health Centre",       district: "Kapiri-Mposhi",         tenantId: "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06" },
  { id: 22415, name: "Mwaiseni Urban Health Centre",   district: "Kitwe",                 tenantId: "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06" },
  { id: 20597, name: "Kayanga Health Post",            district: "Shibuyunji",            tenantId: "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06" },
  { id: 28250, name: "Belfast Clinic Bushbuckridge",   district: "Ehlanzeni",             tenantId: "c43e2923-b2d9-4175-a1a8-ff6b0cd58810" },
  { id: 26194, name: "Xopozo Clinic",                  district: "O.R.Tambo",             tenantId: "c43e2923-b2d9-4175-a1a8-ff6b0cd58810" },
  { id: 29049, name: "Kuruman Clinic",                 district: "John Taolo Gaetsewe",   tenantId: "c43e2923-b2d9-4175-a1a8-ff6b0cd58810" },
  { id: 25593, name: "Khayamnandi Clinic",             district: "Joe Gqabi",             tenantId: "c43e2923-b2d9-4175-a1a8-ff6b0cd58810" },
  { id: 34310, name: "Taikopini",                      district: "Kewabi Rural",          tenantId: "8c2f81fb-06f3-4688-90ea-e9ae27d73191" },
  { id: 34433, name: "Pir",                            district: "Bogia",                 tenantId: "8c2f81fb-06f3-4688-90ea-e9ae27d73191" },
  { id: 34396, name: "Hekwangi",                       district: "Menyamya",              tenantId: "8c2f81fb-06f3-4688-90ea-e9ae27d73191" },
  { id: 33825, name: "Hidonge Malagit Phcu",           district: "Torit",                 tenantId: "8c2f81fb-06f3-4688-90ea-e9ae27d73191" },
  { id: 33467, name: "Olere Phcu",                     district: "Torit",                 tenantId: "8c2f81fb-06f3-4688-90ea-e9ae27d73191" },
];

// ─── Name pools by country and gender ────────────────────────────────────────
const NAMES = {
  ZM: {
    female: ["Mary Phiri", "Grace Mwale", "Chanda Mutale", "Bupe Musonda", "Natasha Tembo",
             "Agnes Banda", "Charity Zulu", "Ruth Nkosi", "Lombe Chilufya", "Priscilla Lungu",
             "Susan Mbewe", "Catherine Sichone", "Joyce Kaunda", "Miriam Simukonda", "Doreen Mumba"],
    male:   ["John Phiri", "Peter Mutale", "Moses Banda", "Francis Mwanza", "Emmanuel Tembo",
             "David Lungu", "Kenneth Zulu", "Samuel Mwale", "Joseph Chilufya", "Victor Musonda",
             "Patrick Kapata", "Geoffrey Chibwe", "Robinson Ngoma", "Alfred Siame", "Daniel Kabwe"],
  },
  ZA: {
    female: ["Nomsa Dlamini", "Thandi Nkosi", "Zanele Khumalo", "Lindiwe Zulu", "Precious Mokoena",
             "Nompumelelo Ndlovu", "Siphokazi Mthembu", "Nokuthula Shabalala", "Bongiwe Ngcobo"],
    male:   ["Sipho Dlamini", "Thabo Nkosi", "Bongani Khumalo", "Siyanda Zulu", "Themba Mokoena",
             "Lungelo Ndlovu", "Mthokozisi Mthembu", "Sifiso Shabalala", "Nkosinathi Ngcobo"],
  },
  PNG: {
    female: ["Maria Wapi", "Ruth Bao", "Grace Tomak", "Anna Karis", "Helen Sele", "Jane Mek"],
    male:   ["John Wapi", "Peter Bao", "James Tomak", "Paul Karis", "Mark Sele", "Luke Mel"],
  },
};

const ROLES = ["vaccinator","recorder","supervisor","facility_in_charge","nurse","midwife","chw","driver","cold_chain_officer"];
const CAMPAIGN_ROLES = ["vaccinator","mobilizer","volunteer","supervisor","recorder","logistics"];
const EDUCATION = ["primary","secondary","certificate","bachelors","masters"];
const TRAINING = ["trained","not_trained","refresher_needed","in_training"];
const GENDERS = ["female","male"];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function countryFor(tenantId) {
  if (tenantId === "4bb7abba-11cd-4c99-96c2-eedc8a4dfd06") return "ZM";
  if (tenantId === "c43e2923-b2d9-4175-a1a8-ff6b0cd58810") return "ZA";
  return "PNG";
}

function nrcFor(country, idx) {
  if (country === "ZM") return `${String(100000 + idx).padStart(6,"0")}/${rnd(10,99)}/1`;
  if (country === "ZA") return `${String(8000000000000 + idx)}`.slice(0, 13);
  return `PNG-${String(1000 + idx).padStart(4,"0")}`;
}

function phoneFor(country) {
  const prefix = country === "ZM" ? "260" : country === "ZA" ? "27" : "675";
  return `+${prefix}${rnd(700000000, 799999999)}`;
}

function buildStaffBatch(facility, startIdx) {
  const country = countryFor(facility.tenantId);
  const count = rnd(4, 8);
  const batch = [];

  // Always include an OIC first
  const oicGender = pick(GENDERS);
  const oicName = pick(NAMES[country][oicGender]);
  batch.push({
    fullName: oicName,
    name: oicName,
    gender: oicGender,
    role: "facility_in_charge",
    position: "Officer In Charge",
    campaignRole: "supervisor",
    contactPhone: phoneFor(country),
    yearsExperience: rnd(5, 20),
    yearsAtFacility: rnd(2, 10),
    isActive: true,
    active: true,
    isVolunteer: false,
    educationLevel: pick(["bachelors","masters","certificate"]),
    trainingStatus: "trained",
    residenceVillage: facility.district,
    employeeId: `EMP-${String(startIdx).padStart(4,"0")}`,
    nrc: nrcFor(country, startIdx),
  });

  for (let i = 1; i < count; i++) {
    const gender = pick(GENDERS);
    const role = pick(ROLES.filter(r => r !== "facility_in_charge"));
    const fullName = pick(NAMES[country][gender]);
    batch.push({
      fullName,
      name: fullName,
      gender,
      role,
      position: role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      campaignRole: pick(CAMPAIGN_ROLES),
      contactPhone: phoneFor(country),
      yearsExperience: rnd(0, 15),
      yearsAtFacility: rnd(0, 8),
      isActive: Math.random() > 0.1,
      active: Math.random() > 0.1,
      isVolunteer: role === "chw" && Math.random() > 0.5,
      educationLevel: pick(EDUCATION),
      trainingStatus: pick(TRAINING),
      residenceVillage: facility.district,
      employeeId: `EMP-${String(startIdx + i).padStart(4,"0")}`,
      nrc: nrcFor(country, startIdx + i),
    });
  }

  return batch;
}

// ─── Cold chain seeding ───────────────────────────────────────────────────────
const EQUIP_TYPES = ["refrigerator","freezer","solar_direct_drive_refrigerator","cold_box","vaccine_carrier","icr"];
const BRANDS_BY_TYPE = {
  refrigerator: ["Vestfrost","Haier","LG","Dometic","Frigibar"],
  freezer: ["Vestfrost","Haier","Electrolux","Dometic"],
  solar_direct_drive_refrigerator: ["SunDanzer","Dulas Arctiko","B Medical Systems","Sievert"],
  cold_box: ["Igloo","Coleman","Engel","Pelican"],
  vaccine_carrier: ["Dometic","B Medical","Labcold","Kaixin"],
  icr: ["Aucma","Vestfrost","Haier"],
};
const MODELS_BY_BRAND = {
  Vestfrost: ["MK 144","MK 204","VLS 200"],
  Haier: ["HBC-80","HBC-100","HBC-150"],
  SunDanzer: ["DCR-50","DCR-80","DCR-165"],
  "Dulas Arctiko": ["PURE 50","PURE 120","PURE 180"],
  "B Medical Systems": ["TCW 3000","TCW 4000"],
  Igloo: ["MaxCold 150","MaxCold 60"],
  Coleman: ["SideKick","Xtreme"],
  Dometic: ["DF1350","DF850","MDF45"],
  default: ["Standard A","Standard B"],
};
const POWER_SOURCES = ["electric","solar","gas_kerosene","battery","dual"];

function buildEquipBatch(facility, startIdx) {
  const count = rnd(2, 5);
  const batch = [];
  const usedSerials = new Set();

  for (let i = 0; i < count; i++) {
    const type = pick(EQUIP_TYPES);
    const brand = pick(BRANDS_BY_TYPE[type] || BRANDS_BY_TYPE.refrigerator);
    const modelList = MODELS_BY_BRAND[brand] || MODELS_BY_BRAND.default;
    const model = pick(modelList);

    let serial;
    let tries = 0;
    do {
      serial = `SN-${brand.substring(0,3).toUpperCase().replace(/\s/g,"")}-${rnd(100000,999999)}`;
      tries++;
    } while (usedSerials.has(serial) && tries < 10);
    usedSerials.add(serial);

    const yearMfg = rnd(2015, 2023);
    const condition = Math.random() < 0.7 ? "functional" : pick(["needs_repair","non_functional"]);

    const powerSource = type === "solar_direct_drive_refrigerator" ? "solar"
                      : type === "cold_box" || type === "vaccine_carrier" ? "battery"
                      : pick(POWER_SOURCES);

    const volumeLitres = type === "cold_box" ? rnd(20,80)
                       : type === "vaccine_carrier" ? rnd(5,20)
                       : rnd(50,300);

    const daysAgoMaint = condition === "needs_repair" ? rnd(90,365) : rnd(10,90);
    const lastMaint = new Date(Date.now() - 1000*60*60*24*daysAgoMaint).toISOString().slice(0,10);
    const nextMaint = new Date(Date.now() + 1000*60*60*24*rnd(30,180)).toISOString().slice(0,10);

    batch.push({
      equipmentType: type,
      brand,
      model,
      serialNumber: serial,
      igaId: `IGA-${String(startIdx + i).padStart(5,"0")}`,
      manufacturer: brand,
      yearOfManufacture: yearMfg,
      yearInstalled: yearMfg + rnd(0,2),
      condition,
      powerSource,
      volumeLitres,
      alarmEnabled: Math.random() > 0.4,
      dataLoggerInstalled: Math.random() > 0.5,
      isActive: condition !== "non_functional",
      lastMaintenanceDate: lastMaint,
      nextMaintenanceDate: nextMaint,
    });
  }

  return batch;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const pool = new Pool({ connectionString: DB_URL });
  let staffIdx = 2000;
  let equipIdx = 6000;
  let totalStaff = 0;
  let totalEquip = 0;

  console.log(`\n🌱 VaxPlan Demo Data Seeder`);
  console.log(`${"━".repeat(60)}`);

  for (const facility of TARGET_FACILITIES) {
    // Verify facility exists in DB and get its real tenantId
    const { rows: fRows } = await pool.query(
      `SELECT id, tenant_id FROM facilities WHERE id = $1 LIMIT 1`,
      [facility.id]
    );
    if (!fRows.length) {
      console.log(`  ⚠  Facility ${facility.id} not found — skipping`);
      continue;
    }
    const tenantId = fRows[0].tenant_id;

    // ─ Staff ─────────────────────────────────────────────────────────────────
    const staffBatch = buildStaffBatch({ ...facility, tenantId }, staffIdx);
    let added = 0;

    for (const s of staffBatch) {
      // If NRC already exists in this tenant, make it unique
      const { rows: dup } = await pool.query(
        `SELECT id FROM facility_staff WHERE tenant_id = $1 AND nrc = $2 LIMIT 1`,
        [tenantId, s.nrc]
      );
      if (dup.length) s.nrc = s.nrc + "-" + rnd(100,999);

      try {
        await pool.query(`
          INSERT INTO facility_staff (
            tenant_id, facility_id, full_name, name, gender, role, position,
            campaign_role, contact_phone, years_experience, years_at_facility,
            is_active, active, is_volunteer, education_level, training_status,
            residence_village, employee_id, nrc, history
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'[]')
        `, [
          tenantId, facility.id, s.fullName, s.name, s.gender, s.role, s.position,
          s.campaignRole, s.contactPhone, s.yearsExperience, s.yearsAtFacility,
          s.isActive, s.active, s.isVolunteer, s.educationLevel, s.trainingStatus,
          s.residenceVillage, s.employeeId, s.nrc,
        ]);
        added++;
      } catch (e) {
        // skip duplicates silently
      }
      staffIdx++;
    }
    totalStaff += added;

    // ─ Cold chain ─────────────────────────────────────────────────────────────
    const equipBatch = buildEquipBatch({ ...facility, tenantId }, equipIdx);
    let eAdded = 0;

    for (const e of equipBatch) {
      try {
        await pool.query(`
          INSERT INTO cold_chain_equipment (
            tenant_id, facility_id, equipment_type, brand, model, serial_number,
            iga_id, manufacturer, year_of_manufacture, year_installed, condition,
            power_source, volume_litres, alarm_enabled, data_logger_installed,
            is_active, last_maintenance_date, next_maintenance_date
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
          ON CONFLICT (tenant_id, serial_number) DO NOTHING
        `, [
          tenantId, facility.id, e.equipmentType, e.brand, e.model, e.serialNumber,
          e.igaId, e.manufacturer, e.yearOfManufacture, e.yearInstalled, e.condition,
          e.powerSource, e.volumeLitres, e.alarmEnabled, e.dataLoggerInstalled,
          e.isActive, e.lastMaintenanceDate, e.nextMaintenanceDate,
        ]);
        eAdded++;
      } catch (e2) {
        // skip duplicates silently
      }
      equipIdx++;
    }
    totalEquip += eAdded;

    const facilityLabel = facility.name.padEnd(42);
    console.log(`  ✅ ${facilityLabel} +${added} staff, +${eAdded} equipment`);
  }

  await pool.end();
  console.log(`${"━".repeat(60)}`);
  console.log(`\n✅ Seeded ${totalStaff} staff members across ${TARGET_FACILITIES.length} facilities`);
  console.log(`✅ Seeded ${totalEquip} cold-chain equipment items\n`);
}

main().catch(e => { console.error("❌ Seed error:", e.message, e.stack); process.exit(1); });
