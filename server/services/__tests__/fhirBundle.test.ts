/**
 * Unit test for the FHIR R4 vaccination bundle builder + validator.
 *
 * Run standalone via: `npx tsx server/services/__tests__/fhirBundle.test.ts`
 * Exits with code 1 if any assertion fails so it can be wired into CI later.
 *
 * Validates the bundle we emit against an embedded subset of FHIR R4 +
 * WHO SMART Guidelines IMMZ constraints (Patient + Encounter + Immunization +
 * Location + Practitioner all present, properly cross-referenced, idempotent
 * conditional-PUT identifiers).
 */

import {
  buildVaccinationBundle,
  validateFhirBundle,
  type VaccinationBundleInput,
} from "../hisInteropService";

let failures = 0;
function assert(cond: any, msg: string) {
  if (!cond) { failures++; console.error("  ✗ " + msg); } else { console.log("  ✓ " + msg); }
}

const sample: VaccinationBundleInput = {
  tenantCode: "ZMB",
  client: {
    id: "00000000-0000-0000-0000-000000000abc",
    name: "Mwape Banda",
    dateOfBirth: "2024-01-15",
    gender: "male",
    externalHisId: null,
  },
  vaccination: {
    id: 4242,
    vaccineName: "Penta-1",
    vaccineCode: null,
    doseNumber: 1,
    administeredDate: "2026-05-12T09:30:00Z",
    batchNumber: "LOT-AB12",
    expiryDate: "2027-04-01",
    vvmStatus: 1,
  },
  facility: {
    id: 17,
    name: "Lusaka Urban Clinic",
    hmisCode: "HF-017",
    latitude: "-15.3875",
    longitude: "28.3228",
    address: "Lusaka Province, Lusaka District",
  },
  practitioner: {
    id: "user-99",
    firstName: "Naomi",
    lastName: "Tembo",
    email: "naomi@moh.gov.zm",
  },
};

console.log("FHIR vaccination bundle — builder + validator tests");

const bundle = buildVaccinationBundle(sample);

assert(bundle.resourceType === "Bundle", "emits a Bundle resource");
assert(bundle.type === "transaction", "emits a transaction Bundle");
assert(Array.isArray(bundle.entry) && bundle.entry.length === 5,
  "transaction bundle contains 5 entries (Patient + Location + Practitioner + Encounter + Immunization)");

const byType: Record<string, any> = {};
for (const e of bundle.entry) byType[e.resource.resourceType] = e;
for (const rt of ["Patient", "Location", "Practitioner", "Encounter", "Immunization"]) {
  assert(byType[rt], `bundle includes a ${rt} entry`);
}

for (const e of bundle.entry) {
  assert(e.request?.method === "PUT", `${e.resource.resourceType}.request.method is PUT (idempotent upsert)`);
  assert(typeof e.request?.url === "string" && e.request.url.includes("identifier="),
    `${e.resource.resourceType}.request.url uses conditional identifier match`);
  assert(e.fullUrl?.startsWith("urn:uuid:"), `${e.resource.resourceType}.fullUrl uses urn:uuid: scheme`);
  assert(Array.isArray(e.resource.identifier) && e.resource.identifier.length > 0,
    `${e.resource.resourceType} carries at least one identifier`);
  assert(e.resource.identifier[0].system.includes("/zmb/"),
    `${e.resource.resourceType} identifier system is tenant-namespaced`);
}

const imm = byType["Immunization"].resource;
assert(imm.status === "completed", "Immunization.status === 'completed'");
assert(imm.vaccineCode?.coding?.[0]?.system === "http://hl7.org/fhir/sid/cvx",
  "Penta-1 maps to CVX coding (WHO SMART VC compatible)");
assert(imm.patient?.reference === byType["Patient"].fullUrl, "Immunization → Patient cross-reference resolves");
assert(imm.encounter?.reference === byType["Encounter"].fullUrl, "Immunization → Encounter cross-reference resolves");
assert(imm.location?.reference === byType["Location"].fullUrl, "Immunization → Location cross-reference resolves");
assert(imm.performer?.[0]?.actor?.reference === byType["Practitioner"].fullUrl,
  "Immunization → Practitioner cross-reference resolves");
assert(imm.lotNumber === "LOT-AB12", "Immunization.lotNumber carried through");
assert(imm.protocolApplied?.[0]?.doseNumberPositiveInt === 1, "Immunization.protocolApplied.doseNumber preserved");

const enc = byType["Encounter"].resource;
assert(enc.status === "finished", "Encounter.status === 'finished'");
assert(enc.class?.code === "AMB", "Encounter.class.code === 'AMB' (ambulatory)");
assert(enc.subject?.reference === byType["Patient"].fullUrl, "Encounter → Patient cross-reference resolves");

const loc = byType["Location"].resource;
assert(loc.position?.latitude === -15.3875 && loc.position?.longitude === 28.3228,
  "Location.position carries facility GPS");

// Idempotency check: rebuilding from the same input yields the same identifiers
const second = buildVaccinationBundle(sample);
for (let i = 0; i < bundle.entry.length; i++) {
  assert(
    JSON.stringify(bundle.entry[i].resource.identifier) ===
      JSON.stringify(second.entry[i].resource.identifier),
    `${bundle.entry[i].resource.resourceType} identifier is stable across rebuilds (idempotent)`,
  );
}

const v = validateFhirBundle(bundle);
assert(v.valid, `validateFhirBundle passes — ${v.errors.length === 0 ? "no issues" : v.errors.join("; ")}`);

// Negative test: a broken bundle should fail validation
const broken = JSON.parse(JSON.stringify(bundle));
broken.entry[0].resource.identifier = [];
const v2 = validateFhirBundle(broken);
assert(!v2.valid, "validateFhirBundle rejects a bundle whose Patient lacks an identifier");

const broken2 = JSON.parse(JSON.stringify(bundle));
broken2.entry.find((e: any) => e.resource.resourceType === "Immunization").resource.patient.reference = "urn:uuid:missing";
const v3 = validateFhirBundle(broken2);
assert(!v3.valid, "validateFhirBundle rejects unresolvable Immunization.patient.reference");

if (failures > 0) {
  console.error(`\n✗ ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\n✓ All FHIR bundle assertions passed");
