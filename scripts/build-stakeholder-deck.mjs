import PptxGenJS from "pptxgenjs";
import { existsSync } from "node:fs";

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE";
pres.title = "VaxPlan — Stakeholder Briefing";
pres.author = "VaxPlan";
pres.company = "VaxPlan";

// ---- Design tokens ----
const C = {
  ink: "0B1F3A",
  inkSoft: "31466B",
  inkMuted: "5A6E8E",
  paper: "F5F7FB",
  panel: "FFFFFF",
  panelAlt: "EEF3FB",
  accent: "1F6FEB",
  accentDeep: "174CB6",
  accentSoft: "DCE8FB",
  teal: "0F766E",
  tealSoft: "CFEFE9",
  amber: "B45309",
  amberSoft: "FCE7C2",
  rose: "B91C1C",
  roseSoft: "FBD5D5",
  green: "166534",
  greenSoft: "D1FAE0",
  rule: "C9D3E2",
};
const FONT_H = "Calibri";
const FONT_B = "Calibri";

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

const SCREENS = {
  home: "screenshots/01-home.jpg",
  signin: "screenshots/02-signin.jpg",
  signup: "screenshots/03-signup.jpg",
};

// ---------------- Helpers ----------------
function addBackground(slide) {
  slide.background = { color: C.paper };
}

function addHeaderBar(slide, pageNum, totalPages, section) {
  slide.addShape(pres.ShapeType.rect, {
    x: 0.6, y: 0.45, w: 0.55, h: 0.08, fill: { color: C.accent }, line: { type: "none" },
  });
  slide.addText("VaxPlan", {
    x: 1.3, y: 0.3, w: 4, h: 0.4,
    fontFace: FONT_H, fontSize: 12, bold: true, color: C.ink, charSpacing: 4,
  });
  slide.addText(section ?? "", {
    x: SLIDE_W - 5.6, y: 0.3, w: 4, h: 0.4,
    fontFace: FONT_B, fontSize: 10, color: C.inkSoft, align: "right",
  });
  slide.addText(`${pageNum} / ${totalPages}`, {
    x: SLIDE_W - 1.4, y: 0.3, w: 0.8, h: 0.4,
    fontFace: FONT_B, fontSize: 10, color: C.inkSoft, align: "right",
  });
}

function addFooter(slide) {
  slide.addShape(pres.ShapeType.line, {
    x: 0.6, y: SLIDE_H - 0.55, w: SLIDE_W - 1.2, h: 0,
    line: { color: C.rule, width: 0.5 },
  });
  slide.addText("VaxPlan  ·  Multitenant GIS Microplanning for National Immunisation Programmes", {
    x: 0.6, y: SLIDE_H - 0.45, w: SLIDE_W - 1.2, h: 0.3,
    fontFace: FONT_B, fontSize: 9, color: C.inkSoft,
  });
}

function chrome(slide, page, total, section) {
  addBackground(slide);
  addHeaderBar(slide, page, total, section);
  addFooter(slide);
}

function title(slide, text, sub) {
  slide.addText(text, {
    x: 0.6, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_H, fontSize: 32, bold: true, color: C.ink,
  });
  if (sub) {
    slide.addText(sub, {
      x: 0.6, y: 1.85, w: 12, h: 0.55,
      fontFace: FONT_B, fontSize: 15, color: C.inkSoft,
    });
  }
}

function card(slide, { x, y, w, h, fill = C.panel, border = C.rule, accent = null }) {
  slide.addShape(pres.ShapeType.rect, {
    x, y, w, h, fill: { color: fill }, line: { color: border, width: 0.5 },
  });
  if (accent) {
    slide.addShape(pres.ShapeType.rect, {
      x, y, w: 0.08, h, fill: { color: accent }, line: { type: "none" },
    });
  }
}

function statBig(slide, { x, y, w, big, label, color = C.accent }) {
  slide.addText(big, {
    x, y, w, h: 0.8,
    fontFace: FONT_H, fontSize: 38, bold: true, color, charSpacing: 1,
  });
  slide.addText(label, {
    x, y: y + 0.85, w, h: 0.5,
    fontFace: FONT_B, fontSize: 11, color: C.inkSoft,
  });
}

function screenshotPanel(slide, { x, y, w, h, path, caption }) {
  // frame
  slide.addShape(pres.ShapeType.rect, {
    x: x - 0.05, y: y - 0.05, w: w + 0.1, h: h + 0.1,
    fill: { color: C.panel }, line: { color: C.rule, width: 0.75 },
  });
  if (path && existsSync(path)) {
    slide.addImage({ path, x, y, w, h, sizing: { type: "contain", w, h } });
  } else {
    slide.addText("[screenshot placeholder]", {
      x, y, w, h, fontFace: FONT_B, fontSize: 12, color: C.inkMuted,
      align: "center", valign: "middle",
    });
  }
  if (caption) {
    slide.addText(caption, {
      x: x - 0.05, y: y + h + 0.1, w: w + 0.1, h: 0.35,
      fontFace: FONT_B, italic: true, fontSize: 10, color: C.inkSoft, align: "center",
    });
  }
}

const TOTAL = 22;
let page = 0;
const slide = () => {
  page += 1;
  return pres.addSlide();
};

// ============================================================
// Slide 1 — Title
// ============================================================
{
  const s = slide();
  s.background = { color: C.ink };
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 0.35, h: SLIDE_H, fill: { color: C.accent }, line: { type: "none" },
  });
  s.addText("VAXPLAN", {
    x: 0.9, y: 2.2, w: 12, h: 1.3,
    fontFace: FONT_H, fontSize: 72, bold: true, color: "FFFFFF", charSpacing: 12,
  });
  s.addText("A multitenant GIS microplanning platform for national immunisation programmes.", {
    x: 0.95, y: 3.5, w: 11.5, h: 0.9,
    fontFace: FONT_B, fontSize: 22, color: "DDE6F5",
  });
  s.addShape(pres.ShapeType.line, {
    x: 0.95, y: 4.6, w: 1.5, h: 0, line: { color: C.accent, width: 2.5 },
  });
  s.addText("Stakeholder briefing  ·  2026", {
    x: 0.95, y: 4.75, w: 10, h: 0.4,
    fontFace: FONT_B, fontSize: 14, color: "9FB4D6", charSpacing: 6,
  });
  s.addText("Plan vaccination sessions where they're needed — even offline.", {
    x: 0.95, y: 6.4, w: 11, h: 0.45,
    fontFace: FONT_H, fontSize: 16, italic: true, color: "9FB4D6",
  });
}

// ============================================================
// Slide 2 — Executive summary
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "Executive summary");
  title(
    s,
    "Microplanning, finally on a single map.",
    "VaxPlan replaces the paper-and-spreadsheet stack that national EPIs use to plan, deliver and account for every vaccination session — from the national office to the last village.",
  );

  // KPI strip
  const stats = [
    { big: "10", label: "guided steps from blank slate to an approved microplan" },
    { big: "5", label: "role tiers from facility clerk to national administrator" },
    { big: "100%", label: "offline-capable: every screen continues to work without a signal" },
    { big: "1", label: "tenant per Ministry — full data isolation and own SSO" },
  ];
  stats.forEach((st, i) => {
    statBig(s, { x: 0.6 + i * 3.1, y: 2.7, w: 2.9, big: st.big, label: st.label });
  });

  // Three closing lines
  card(s, { x: 0.6, y: 4.7, w: 12.1, h: 2.0, accent: C.accent });
  s.addText("Why this matters now", {
    x: 0.85, y: 4.85, w: 6, h: 0.4,
    fontFace: FONT_H, fontSize: 16, bold: true, color: C.ink,
  });
  s.addText(
    [
      "•  Coverage gaps and zero-dose children remain concentrated in places no spreadsheet ever named.",
      "•  Donors and governments are pushing for accountable, georeferenced delivery — not aggregate forms.",
      "•  Connectivity is improving but is still uneven; tools built only for online dashboards exclude the field.",
    ].join("\n"),
    {
      x: 0.85, y: 5.3, w: 11.6, h: 1.3,
      fontFace: FONT_B, fontSize: 13, color: C.inkSoft, paraSpaceAfter: 4,
    },
  );
}

// ============================================================
// Slide 3 — The Problem (deeper)
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "01  ·  The problem");
  title(
    s,
    "Microplanning today is invisible work on top of broken data.",
    "Four compounding failures cost EPIs accuracy, time and coverage at every quarterly cycle.",
  );

  const cards = [
    {
      t: "Stale denominators",
      b: "Catchment populations are recopied each quarter from census tables that are 10+ years old. Targets and dropout rates drift further from reality every cycle.",
    },
    {
      t: "No spatial picture",
      b: "Plans live in Excel rows. Health workers can't see which villages sit beyond 5 km, which were missed last round, or where zero-dose clusters concentrate.",
    },
    {
      t: "Broken reporting loops",
      b: "Submissions move by photo, email and WhatsApp. District review rarely closes inside the quarter, and provincial roll-ups are reconstructed weeks after the fact.",
    },
    {
      t: "Offline-blind tools",
      b: "Generic BI dashboards assume connectivity. The facilities that need them most — rural, low-bandwidth, intermittent power — are the ones they fail in.",
    },
  ];
  const x0 = 0.6, y0 = 2.85, w = 5.95, h = 1.85, gap = 0.25;
  cards.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = x0 + col * (w + gap);
    const y = y0 + row * (h + gap);
    card(s, { x, y, w, h, accent: C.rose });
    s.addText(c.t, {
      x: x + 0.3, y: y + 0.2, w: w - 0.5, h: 0.45,
      fontFace: FONT_H, fontSize: 16, bold: true, color: C.ink,
    });
    s.addText(c.b, {
      x: x + 0.3, y: y + 0.7, w: w - 0.5, h: 1.05,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 4 — Vision / Positioning
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "02  ·  Vision");
  title(
    s,
    "One platform. Every facility. Every quarter.",
    "VaxPlan gives Ministries of Health a shared, map-first workspace for routine immunisation and campaign planning — designed for the realities of the last mile.",
  );

  const pillars = [
    { t: "Map-driven", b: "GRID3 settlement footprints, WorldPop rasters and drawn catchments on one interactive map. Click a village to plan a session there." },
    { t: "Offline-first", b: "Dexie/IndexedDB replicates facility, village, client and planning data. A mutation outbox flushes when the device sees a signal again." },
    { t: "Multitenant", b: "Each Ministry runs its own tenant with its own users, schedule, boundaries and identity provider. Cross-tenant writes are blocked at the API." },
    { t: "Accountable", b: "Draft → Pending → Approved → Locked, with an immutable audit log on every sensitive change. RED checklists seed automatically on approval." },
  ];
  const y = 3.45, h = 3.0, w = 2.95, gap = 0.2, x0 = 0.6;
  pillars.forEach((p, i) => {
    const x = x0 + i * (w + gap);
    card(s, { x, y, w, h });
    s.addText((i + 1).toString().padStart(2, "0"), {
      x: x + 0.3, y: y + 0.25, w: 1.5, h: 0.5,
      fontFace: FONT_H, fontSize: 22, bold: true, color: C.accent, charSpacing: 4,
    });
    s.addShape(pres.ShapeType.line, {
      x: x + 0.3, y: y + 0.85, w: 0.8, h: 0, line: { color: C.accent, width: 1.8 },
    });
    s.addText(p.t, {
      x: x + 0.3, y: y + 1.0, w: w - 0.5, h: 0.5,
      fontFace: FONT_H, fontSize: 18, bold: true, color: C.ink,
    });
    s.addText(p.b, {
      x: x + 0.3, y: y + 1.55, w: w - 0.5, h: 1.35,
      fontFace: FONT_B, fontSize: 11.5, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 5 — Product surface (landing screenshot)
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "03  ·  Product");
  title(
    s,
    "Branded for the Ministry, recognisable to the field.",
    "Every tenant gets its own home page, identity provider and country styling — VaxPlan is the platform, the Ministry is the brand.",
  );
  screenshotPanel(s, {
    x: 0.6, y: 2.7, w: 7.2, h: 4.05, path: SCREENS.home,
    caption: "VaxPlan public landing — recognisable promise: \"Reach every child. Plan every session.\"",
  });

  // right column — talking points
  const tx = 8.1, tw = 4.7;
  card(s, { x: tx, y: 2.7, w: tw, h: 4.05, accent: C.accent });
  s.addText("What stakeholders see first", {
    x: tx + 0.25, y: 2.85, w: tw - 0.4, h: 0.4,
    fontFace: FONT_H, fontSize: 14, bold: true, color: C.ink,
  });
  s.addText(
    [
      "•  Plain promise — no jargon, no acronyms above the fold.",
      "•  Two paths: existing users sign in, new Ministries request access.",
      "•  Trust badges call out SSO, data isolation, HIS-friendliness, audit.",
      "•  Country switcher appears once you're in — the same login lets a regional officer cross approved borders.",
      "•  Light and dark themes follow OS preferences.",
    ].join("\n"),
    {
      x: tx + 0.25, y: 3.3, w: tw - 0.4, h: 3.35,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, paraSpaceAfter: 6, valign: "top",
    },
  );
}

// ============================================================
// Slide 6 — Who we serve (5-tier RBAC)
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "04  ·  Stakeholders");
  title(
    s,
    "Built around the five people who run immunisation.",
    "Each role sees only what it needs. Permissions and visibility are scoped to its level in the health system.",
  );

  const rows = [
    ["Facility clerk", "Author microplans, log sessions, capture per-antigen doses and defaulters, work fully offline."],
    ["Facility in-charge", "Submit the microplan for approval, sign off on supervisory visits, manage stock at the facility."],
    ["District manager", "Review and approve facility microplans, monitor coverage by catchment, reconcile unmapped antigens."],
    ["Provincial coordinator", "Aggregate district performance, escalate gaps, allocate supervisory visits across the province."],
    ["National administrator / GIS specialist", "Configure schedules, tenants, SSO and boundaries; approve national plans; full tenant-wide visibility."],
    ["Donors & partners (read-only)", "Audit-grade visibility into approved plans, coverage and supply needs without write access."],
  ];
  const y0 = 2.8, h = 0.62, gap = 0.08;
  rows.forEach((r, i) => {
    const y = y0 + i * (h + gap);
    card(s, { x: 0.6, y, w: 12.1, h });
    s.addShape(pres.ShapeType.rect, {
      x: 0.6, y, w: 0.08, h, fill: { color: i < 5 ? C.accent : C.teal }, line: { type: "none" },
    });
    s.addText(r[0], {
      x: 0.85, y, w: 3.8, h, fontFace: FONT_H, fontSize: 13.5, bold: true, color: C.ink, valign: "middle",
    });
    s.addShape(pres.ShapeType.line, {
      x: 4.75, y: y + 0.12, w: 0, h: h - 0.24, line: { color: C.rule, width: 0.5 },
    });
    s.addText(r[1], {
      x: 4.95, y, w: 7.6, h, fontFace: FONT_B, fontSize: 12, color: C.inkSoft, valign: "middle",
    });
  });
}

// ============================================================
// Slide 7 — Capabilities map
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "05  ·  Capabilities");
  title(
    s,
    "Twelve modules. One coherent workspace.",
    "Each module solves a real Ministry workflow — not a generic BI tab.",
  );

  const caps = [
    { t: "Facility & village registry", b: "Geo-coordinates, drawn catchments, refrigerator and power status." },
    { t: "Microplan wizard", b: "Ten guided steps for routine and campaigns. Drafts auto-save and resume." },
    { t: "Vaccine requirements", b: "Per-antigen forecasts against the tenant schedule, with wastage factors." },
    { t: "Session execution", b: "Mark-done with per-antigen counts, defaulter capture, offline outbox." },
    { t: "Map workspace", b: "GRID3 footprints, WorldPop rasters, catchment polygons, defaulter dots." },
    { t: "Settlement intelligence", b: "Detect unmapped communities by comparing satellite footprints to the registry." },
    { t: "Client logbook", b: "Digital immunisation register; track dose histories per child." },
    { t: "Defaulter tracking", b: "Auto-identify missed children, one-click outreach session creation." },
    { t: "Stock ledger", b: "Facility-level inventory with consumption tracking and stock-out alerts." },
    { t: "Approvals hub", b: "Draft → Pending → Approved → Locked, with comments and reason codes." },
    { t: "Supervision workspace", b: "WHO RED checklists auto-seeded for every facility on approval." },
    { t: "HIS integrations", b: "Bi-directional adapters for DHIS2 and FHIR R4 (Patient/Immunization)." },
  ];
  const x0 = 0.6, y0 = 2.65, w = 3.0, h = 1.5, gx = 0.13, gy = 0.16;
  caps.forEach((c, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = x0 + col * (w + gx);
    const y = y0 + row * (h + gy);
    card(s, { x, y, w, h, accent: C.accent });
    s.addText(c.t, {
      x: x + 0.25, y: y + 0.18, w: w - 0.4, h: 0.45,
      fontFace: FONT_H, fontSize: 12.5, bold: true, color: C.ink,
    });
    s.addText(c.b, {
      x: x + 0.25, y: y + 0.65, w: w - 0.4, h: 0.85,
      fontFace: FONT_B, fontSize: 10.5, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 8 — A day in the life: facility clerk
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "06  ·  Day in the life");
  title(
    s,
    "Tuesday morning at a Health Post, 90 minutes from the road.",
    "A facility clerk's whole day — from prep to submission — without ever leaving VaxPlan.",
  );

  const steps = [
    { t: "06:30", h: "Plan the day on the calendar", b: "Open the Sessions Hub calendar, pick today's date, hit \"Plan a session on this day\". The form opens with the date already filled." },
    { t: "07:15", h: "Drive the bike to the outreach village", b: "App is fully offline. Catchment polygons, household list and last-quarter coverage are already cached on the phone." },
    { t: "09:00", h: "Vaccinate", b: "Mark-done captures per-antigen counts (OPV-1, PENTA-2, MR-1...). Defaulters from previous rounds appear automatically as a checklist." },
    { t: "12:30", h: "Catch unserved households", b: "Click any unmapped house on the map: VaxPlan offers \"Plan a session here\" and prefills the outreach form with the right village link." },
    { t: "16:00", h: "Sync on return", b: "Back in 4G range, the outbox flushes. The in-charge receives the day's session ready to review and submit upward." },
  ];
  const y0 = 2.7, h = 0.78, gap = 0.1;
  steps.forEach((st, i) => {
    const y = y0 + i * (h + gap);
    card(s, { x: 0.6, y, w: 12.1, h, accent: C.accent });
    s.addText(st.t, {
      x: 0.85, y, w: 1.0, h, fontFace: FONT_H, fontSize: 14, bold: true, color: C.accent, valign: "middle",
    });
    s.addText(st.h, {
      x: 1.9, y, w: 3.6, h, fontFace: FONT_H, fontSize: 13, bold: true, color: C.ink, valign: "middle",
    });
    s.addShape(pres.ShapeType.line, {
      x: 5.55, y: y + 0.1, w: 0, h: h - 0.2, line: { color: C.rule, width: 0.5 },
    });
    s.addText(st.b, {
      x: 5.75, y, w: 6.8, h, fontFace: FONT_B, fontSize: 11.5, color: C.inkSoft, valign: "middle",
    });
  });
}

// ============================================================
// Slide 9 — A quarter in the life: district & national
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "07  ·  Quarter in the life");
  title(
    s,
    "One quarter, three altitudes, one chain of accountability.",
    "Approval flows up. Visibility flows down. Both happen inside VaxPlan, in the same week.",
  );

  // Three timeline columns
  const cols = [
    {
      who: "Facility",
      colour: C.accent,
      items: [
        "Author or copy-forward last quarter's microplan in the wizard.",
        "Forecast vaccine requirements against the tenant schedule.",
        "Submit to district for review with one tap.",
      ],
    },
    {
      who: "District / Province",
      colour: C.teal,
      items: [
        "Approvals Hub queues every pending plan by facility.",
        "Reviewer compares targets, sessions and supply to last quarter on the map.",
        "Approve, request changes with a reason, or escalate to province.",
      ],
    },
    {
      who: "National EPI",
      colour: C.amber,
      items: [
        "National dashboard shows DTP1, DTP1→DTP3 dropout, zero-dose by district.",
        "Supervisory visits with WHO RED checklists are auto-seeded for every approved facility.",
        "Sign off the quarter and push aggregate indicators upstream (DHIS2).",
      ],
    },
  ];
  const y = 2.7, h = 4.05, w = 4.0, gap = 0.15, x0 = 0.6;
  cols.forEach((c, i) => {
    const x = x0 + i * (w + gap);
    card(s, { x, y, w, h });
    s.addShape(pres.ShapeType.rect, {
      x, y, w, h: 0.7, fill: { color: c.colour }, line: { type: "none" },
    });
    s.addText(c.who, {
      x: x + 0.25, y: y + 0.1, w: w - 0.5, h: 0.5,
      fontFace: FONT_H, fontSize: 18, bold: true, color: "FFFFFF",
    });
    s.addText(
      c.items.map((it, j) => `${j + 1}.  ${it}`).join("\n"),
      {
        x: x + 0.3, y: y + 0.95, w: w - 0.5, h: h - 1.1,
        fontFace: FONT_B, fontSize: 12, color: C.inkSoft, paraSpaceAfter: 8, valign: "top",
      },
    );
  });
}

// ============================================================
// Slide 10 — Map-driven planning
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "08  ·  Map-driven planning");
  title(
    s,
    "The map is the plan.",
    "Health workers see catchments, settlements, defaulters and last-quarter coverage on one canvas — and act from it.",
  );

  // Left: capability list
  card(s, { x: 0.6, y: 2.7, w: 6.0, h: 4.05 });
  s.addText("What's on the canvas", {
    x: 0.85, y: 2.85, w: 5.5, h: 0.4,
    fontFace: FONT_H, fontSize: 15, bold: true, color: C.ink,
  });
  s.addText(
    [
      "•  Facility points sized by catchment population.",
      "•  Catchment polygons, drawn by the facility or by GIS specialists.",
      "•  GRID3 settlement footprints overlaid on OpenStreetMap.",
      "•  WorldPop population rasters (binary tiles cached for offline).",
      "•  Defaulter dots — children who missed their last scheduled dose.",
      "•  Hard-to-reach flags, terrain difficulty, distance-to-facility.",
      "•  Live coverage shading recomputed as sessions are reported.",
    ].join("\n"),
    {
      x: 0.85, y: 3.3, w: 5.5, h: 3.4,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, paraSpaceAfter: 6, valign: "top",
    },
  );

  // Right: action list
  card(s, { x: 6.75, y: 2.7, w: 5.95, h: 4.05, accent: C.accent });
  s.addText("What you do from it", {
    x: 7.0, y: 2.85, w: 5.5, h: 0.4,
    fontFace: FONT_H, fontSize: 15, bold: true, color: C.ink,
  });
  s.addText(
    [
      "•  Click any village → \"Plan a session here\" with the form prefilled.",
      "•  Click a household icon → reach an unserved family with a single tap.",
      "•  Draw or redraw a catchment polygon and the recompute pushes targets, schedule and supply in real time.",
      "•  Pin a calendar day → open the New Session dialog with the date already set.",
      "•  Filter by quarter, province, district, facility, hard-to-reach status.",
    ].join("\n"),
    {
      x: 7.0, y: 3.3, w: 5.5, h: 3.4,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, paraSpaceAfter: 6, valign: "top",
    },
  );
}

// ============================================================
// Slide 11 — Offline-first architecture
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "09  ·  Offline-first");
  title(
    s,
    "Works in airplane mode. Works on a motorbike. Works in the rainforest.",
    "The last mile is built in from day one, not bolted on after launch.",
  );

  const blocks = [
    {
      t: "Local replica",
      b: "Dexie / IndexedDB stores facilities, villages, clients, microplans and sessions on the device. Every screen reads from local cache first.",
    },
    {
      t: "Mutation outbox",
      b: "Every offline action is queued in an outbox table. The user keeps working; the platform doesn't lose the write if the network drops mid-save.",
    },
    {
      t: "Two-way sync",
      b: "syncEngine flushes outbox via POST /api/sync/batch and pulls server updates via /api/sync/pull. Conflicts resolve by tenant + audit timestamp.",
    },
    {
      t: "GIS cache v2 & v3",
      b: "GeoJSON and binary GeoTIFF map tiles cache locally, so the map keeps drawing population and settlements without a connection.",
    },
    {
      t: "Unmapped antigen handling",
      b: "Old offline clients can still report unknown vaccine codes. Server stores them under perAntigenUnmapped, audits each occurrence, and surfaces a reconcile screen.",
    },
    {
      t: "Resumable wizard",
      b: "The microplan wizard auto-saves draft state. Close the tab, lose power, switch device — pick up exactly where you left off.",
    },
  ];
  const x0 = 0.6, y0 = 2.7, w = 3.95, h = 1.9, gx = 0.2, gy = 0.15;
  blocks.forEach((b, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = x0 + col * (w + gx);
    const y = y0 + row * (h + gy);
    card(s, { x, y, w, h, accent: C.teal });
    s.addText(b.t, {
      x: x + 0.25, y: y + 0.2, w: w - 0.4, h: 0.45,
      fontFace: FONT_H, fontSize: 13.5, bold: true, color: C.ink,
    });
    s.addText(b.b, {
      x: x + 0.25, y: y + 0.7, w: w - 0.4, h: 1.15,
      fontFace: FONT_B, fontSize: 11, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 12 — Vaccine schedule + mark-done
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "10  ·  Schedule integrity");
  title(
    s,
    "Tenant-owned schedule, no data ever silently dropped.",
    "Every Ministry runs the antigens it actually uses — and the platform refuses to lose a count, even from an out-of-date client.",
  );

  // Left half: schedule
  card(s, { x: 0.6, y: 2.7, w: 6.0, h: 4.05 });
  s.addText("Per-tenant vaccine schedule", {
    x: 0.85, y: 2.85, w: 5.5, h: 0.4,
    fontFace: FONT_H, fontSize: 15, bold: true, color: C.ink,
  });
  s.addText(
    [
      "•  Each tenant declares its own antigens, doses and intervals.",
      "•  expandVaccineSchedule(...) auto-generates per-dose records (OPV-1, OPV-2, PENTA-1...).",
      "•  Codes are canonicalised case- and whitespace-insensitively (\"opv-1\" → \"OPV-1\").",
      "•  Schedule changes flow to every facility in the tenant without a redeploy.",
      "•  Wastage factors and target ages travel with the antigen, not the spreadsheet.",
    ].join("\n"),
    {
      x: 0.85, y: 3.3, w: 5.5, h: 3.4,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, paraSpaceAfter: 6, valign: "top",
    },
  );

  // Right half: mark-done
  card(s, { x: 6.75, y: 2.7, w: 5.95, h: 4.05, accent: C.amber });
  s.addText("Mark-done with safety net", {
    x: 7.0, y: 2.85, w: 5.5, h: 0.4,
    fontFace: FONT_H, fontSize: 15, bold: true, color: C.ink,
  });
  s.addText(
    [
      "•  Known antigens land under vaccinatedCounts.perAntigen at the canonical code.",
      "•  Unknown codes (stale clients, mid-flight migrations) go to perAntigenUnmapped.",
      "•  Both still count toward totals — no field worker's day disappears because their app was a build behind.",
      "•  Every occurrence writes an audit entry: mark_done_unmapped_antigens.",
      "•  Response carries an unmappedAntigenCodes array so offline clients warn the user instead of failing silently.",
      "•  A reconcile screen lets district managers map stragglers back into the canonical schedule.",
    ].join("\n"),
    {
      x: 7.0, y: 3.3, w: 5.5, h: 3.4,
      fontFace: FONT_B, fontSize: 11.5, color: C.inkSoft, paraSpaceAfter: 5, valign: "top",
    },
  );
}

// ============================================================
// Slide 13 — Multitenant + security
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "11  ·  Multitenant & security");
  title(
    s,
    "One platform, many Ministries — strictly isolated.",
    "Every byte is tagged with a tenant. Every cross-tenant write is refused. Every approval is auditable.",
  );

  const items = [
    {
      t: "Tenant-scoped data",
      b: "Every domain table carries a tenantId. requireTenant middleware filters all reads to the active tenant.",
    },
    {
      t: "Cross-tenant write guard",
      b: "crossTenantWriteGuard rejects writes to any tenant other than the user's home tenant with HTTP 403 — even for superusers exploring another country.",
    },
    {
      t: "Bring-your-own SSO",
      b: "Per-tenant identity provider configurations support OIDC and SAML. The Ministry's IT team owns the directory; we never see passwords.",
    },
    {
      t: "Self-service onboarding with approval",
      b: "Hierarchical signup workflow: a new request lands with the national administrator for the country, not in a global support queue.",
    },
    {
      t: "Immutable audit log",
      b: "logAudit records userId, action, entityType, entityId, oldValue, newValue, IP. Approvals, reassignments and reconciliations are all replayable.",
    },
    {
      t: "Country switcher, scoped writes",
      b: "Regional officers can browse other countries (read-only) without leaving their session. Writing requires being in your home tenant.",
    },
  ];
  const x0 = 0.6, y0 = 2.7, w = 3.95, h = 1.9, gx = 0.2, gy = 0.15;
  items.forEach((b, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = x0 + col * (w + gx);
    const y = y0 + row * (h + gy);
    card(s, { x, y, w, h, accent: C.accentDeep });
    s.addText(b.t, {
      x: x + 0.25, y: y + 0.2, w: w - 0.4, h: 0.45,
      fontFace: FONT_H, fontSize: 13, bold: true, color: C.ink,
    });
    s.addText(b.b, {
      x: x + 0.25, y: y + 0.7, w: w - 0.4, h: 1.15,
      fontFace: FONT_B, fontSize: 11, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 14 — HIS integration story
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "12  ·  Interoperability");
  title(
    s,
    "Plays well with the HIS the Ministry already runs.",
    "VaxPlan is the planning and field layer. It doesn't replace the national HIS — it feeds and consumes it.",
  );

  // Diagram-ish blocks
  const left = { x: 0.6, y: 2.85, w: 3.5, h: 4.0 };
  const mid = { x: 4.5, y: 2.85, w: 4.3, h: 4.0 };
  const right = { x: 9.2, y: 2.85, w: 3.5, h: 4.0 };

  // Left — field
  card(s, left);
  s.addText("Field", { x: left.x + 0.25, y: left.y + 0.2, w: left.w - 0.5, h: 0.5,
    fontFace: FONT_H, fontSize: 14, bold: true, color: C.accent });
  s.addText(
    [
      "Facility clerks",
      "In-charges",
      "Outreach teams",
      "Defaulter sweeps",
    ].join("\n"),
    { x: left.x + 0.25, y: left.y + 0.8, w: left.w - 0.5, h: left.h - 1.0,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, paraSpaceAfter: 8, valign: "top" },
  );

  // Middle — VaxPlan
  card(s, { ...mid, accent: C.accent });
  s.addText("VaxPlan", { x: mid.x + 0.25, y: mid.y + 0.2, w: mid.w - 0.5, h: 0.5,
    fontFace: FONT_H, fontSize: 16, bold: true, color: C.ink });
  s.addText(
    [
      "•  Microplans, sessions, supervisory visits",
      "•  Per-antigen counts and defaulters",
      "•  Catchment polygons and zero-dose layers",
      "•  Offline outbox + bi-directional sync",
      "•  Approvals, comments, audit",
    ].join("\n"),
    { x: mid.x + 0.25, y: mid.y + 0.8, w: mid.w - 0.5, h: mid.h - 1.0,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, paraSpaceAfter: 6, valign: "top" },
  );

  // Right — HIS estate
  card(s, right);
  s.addText("HIS estate", { x: right.x + 0.25, y: right.y + 0.2, w: right.w - 0.5, h: 0.5,
    fontFace: FONT_H, fontSize: 14, bold: true, color: C.teal });
  s.addText(
    [
      "DHIS2 (aggregates, org units)",
      "FHIR R4 (Patient, Immunization)",
      "SmartCare / eLMIS / iHRIS via adapter",
      "National data warehouse",
    ].join("\n"),
    { x: right.x + 0.25, y: right.y + 0.8, w: right.w - 0.5, h: right.h - 1.0,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, paraSpaceAfter: 8, valign: "top" },
  );

  // Arrows (using chevron text)
  s.addText("›", {
    x: left.x + left.w - 0.1, y: 4.55, w: 0.5, h: 0.6,
    fontFace: FONT_H, fontSize: 36, bold: true, color: C.accent, align: "center",
  });
  s.addText("›", {
    x: mid.x + mid.w - 0.1, y: 4.55, w: 0.5, h: 0.6,
    fontFace: FONT_H, fontSize: 36, bold: true, color: C.accent, align: "center",
  });
}

// ============================================================
// Slide 15 — Approvals & supervision
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "13  ·  Accountability");
  title(
    s,
    "Every plan signed. Every visit logged. Every change replayable.",
    "Approvals and supervision are first-class workflows, not PDFs in shared folders.",
  );

  // Lifecycle pill bar
  const lifeY = 2.85;
  const states = ["Draft", "Pending", "Approved", "Locked"];
  const colors = [C.inkMuted, C.amber, C.green, C.accentDeep];
  const sw = 2.7, gap = 0.3, lx0 = 0.6;
  states.forEach((st, i) => {
    const x = lx0 + i * (sw + gap);
    card(s, { x, y: lifeY, w: sw, h: 0.85, fill: colors[i], border: colors[i] });
    s.addText(st, {
      x, y: lifeY, w: sw, h: 0.85,
      fontFace: FONT_H, fontSize: 18, bold: true, color: "FFFFFF",
      align: "center", valign: "middle",
    });
    if (i < states.length - 1) {
      s.addText("›", {
        x: x + sw + 0.02, y: lifeY, w: 0.3, h: 0.85,
        fontFace: FONT_H, fontSize: 28, bold: true, color: C.inkSoft,
        align: "center", valign: "middle",
      });
    }
  });

  // Two columns: review chain + supervision auto-seed
  card(s, { x: 0.6, y: 4.05, w: 6.0, h: 2.7, accent: C.accent });
  s.addText("Hierarchical review chain", {
    x: 0.85, y: 4.2, w: 5.5, h: 0.4,
    fontFace: FONT_H, fontSize: 14, bold: true, color: C.ink,
  });
  s.addText(
    [
      "•  Facility clerks/in-charges author; district approves routine; province approves campaigns.",
      "•  Reviewers can request changes with a reason code that travels back to the author's queue.",
      "•  Locked plans cannot be edited — only superseded by a new revision with full audit trail.",
    ].join("\n"),
    {
      x: 0.85, y: 4.6, w: 5.5, h: 2.0,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, paraSpaceAfter: 6, valign: "top",
    },
  );

  card(s, { x: 6.75, y: 4.05, w: 5.95, h: 2.7, accent: C.teal });
  s.addText("Auto-seeded supervision (RED)", {
    x: 7.0, y: 4.2, w: 5.5, h: 0.4,
    fontFace: FONT_H, fontSize: 14, bold: true, color: C.ink,
  });
  s.addText(
    [
      "•  Approving a microplan automatically seeds a quarterly supervisory visit for every facility in scope.",
      "•  Each visit is prepopulated with a 12-point WHO Reaching Every District (RED) checklist.",
      "•  Supervisor scores feed the district dashboard so weak facilities surface in the next cycle.",
    ].join("\n"),
    {
      x: 7.0, y: 4.6, w: 5.5, h: 2.0,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, paraSpaceAfter: 6, valign: "top",
    },
  );
}

// ============================================================
// Slide 16 — Reporting & analytics
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "14  ·  Reporting & analytics");
  title(
    s,
    "The indicators EPI managers are actually asked about.",
    "Computed live off the operational data — not exported, retyped and reconciled a week later.",
  );

  const kpis = [
    { big: "DTP1", label: "First-contact coverage — proxy for access to immunisation." },
    { big: "DTP1→3", label: "Drop-out rate — proxy for system retention quality." },
    { big: "Zero-dose", label: "Children with no DTP1 by 12 months — the equity headline." },
    { big: "MCV1 / MCV2", label: "Measles coverage and second-dose follow-through." },
  ];
  kpis.forEach((k, i) => {
    statBig(s, { x: 0.6 + i * 3.1, y: 2.7, w: 2.9, big: k.big, label: k.label, color: C.accent });
  });

  // Bottom row: dashboards
  const blocks = [
    { t: "District scorecards", b: "Supervision coverage, DTP3 by facility, missed-community count, sessions held vs planned." },
    { t: "Missed communities", b: "Automated report cross-references GRID3 settlements against held sessions to surface populations the plan missed." },
    { t: "Supply realism", b: "Forecast vs consumption vs wastage per antigen — flags facilities with persistent stock-out risk." },
  ];
  const y0 = 4.5, h = 2.25, w = 3.97, gx = 0.2, x0 = 0.6;
  blocks.forEach((b, i) => {
    const x = x0 + i * (w + gx);
    card(s, { x, y: y0, w, h, accent: C.accent });
    s.addText(b.t, {
      x: x + 0.25, y: y0 + 0.2, w: w - 0.4, h: 0.45,
      fontFace: FONT_H, fontSize: 14, bold: true, color: C.ink,
    });
    s.addText(b.b, {
      x: x + 0.25, y: y0 + 0.7, w: w - 0.4, h: h - 0.85,
      fontFace: FONT_B, fontSize: 11.5, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 17 — Self-service onboarding (screenshot)
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "15  ·  Onboarding");
  title(
    s,
    "A Ministry can request access in under two minutes.",
    "Self-service signup with hierarchical approval — no sales gate, no email chain, no spreadsheet of access requests.",
  );

  screenshotPanel(s, {
    x: 0.6, y: 2.7, w: 7.2, h: 4.05, path: SCREENS.signup,
    caption: "Self-service request form — country, role, and an optional note to the national admin.",
  });

  const tx = 8.1, tw = 4.7;
  card(s, { x: tx, y: 2.7, w: tw, h: 4.05, accent: C.accent });
  s.addText("How approval works", {
    x: tx + 0.25, y: 2.85, w: tw - 0.4, h: 0.4,
    fontFace: FONT_H, fontSize: 14, bold: true, color: C.ink,
  });
  s.addText(
    [
      "•  If the Ministry already runs a tenant, the request lands with the country's national administrator.",
      "•  If not, VaxPlan logs the interest and reaches out about onboarding.",
      "•  Approvals propagate down — district managers approve facility staff, not headquarters.",
      "•  Onboarded users sign in via the tenant's chosen identity provider (OIDC / SAML).",
      "•  Email domains map to tenants, so the country switcher routes them home automatically.",
    ].join("\n"),
    {
      x: tx + 0.25, y: 3.3, w: tw - 0.4, h: 3.35,
      fontFace: FONT_B, fontSize: 11.5, color: C.inkSoft, paraSpaceAfter: 6, valign: "top",
    },
  );
}

// ============================================================
// Slide 18 — Comparison (vs paper, spreadsheet, DHIS2-only)
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "16  ·  Where VaxPlan fits");
  title(
    s,
    "Not another dashboard — the missing planning layer.",
    "VaxPlan complements DHIS2 and the national HIS; it doesn't compete with them.",
  );

  // Comparison table
  const cols = ["Capability", "Paper / register", "Spreadsheet", "DHIS2 only", "VaxPlan"];
  const colXs = [0.6, 3.4, 5.6, 7.8, 10.5];
  const colWs = [2.7, 2.1, 2.1, 2.6, 2.2];
  const y0 = 2.75, headerH = 0.55, rowH = 0.5;
  // Header
  cols.forEach((c, i) => {
    s.addShape(pres.ShapeType.rect, {
      x: colXs[i], y: y0, w: colWs[i], h: headerH,
      fill: { color: i === 4 ? C.accent : C.ink }, line: { type: "none" },
    });
    s.addText(c, {
      x: colXs[i] + 0.15, y: y0, w: colWs[i] - 0.2, h: headerH,
      fontFace: FONT_H, fontSize: 11.5, bold: true, color: "FFFFFF", valign: "middle",
    });
  });
  const rows = [
    ["Map-driven catchments", "—", "—", "Some", "Yes — drawn & GRID3"],
    ["Offline session capture", "Manual", "Manual", "Limited", "First-class outbox"],
    ["Per-antigen forecasting", "—", "Yes (fragile)", "Aggregated", "Tenant schedule"],
    ["Hierarchical approvals", "Signatures", "—", "Workflow plugin", "Built-in chain"],
    ["Auto supervisory visits", "—", "—", "—", "RED checklist seeded"],
    ["Multitenant SSO", "—", "—", "Per instance", "BYO IdP per tenant"],
    ["Audit on every write", "—", "—", "Partial", "Immutable log"],
  ];
  rows.forEach((r, i) => {
    const y = y0 + headerH + i * rowH;
    const stripe = i % 2 === 0 ? C.panel : C.panelAlt;
    cols.forEach((_, j) => {
      s.addShape(pres.ShapeType.rect, {
        x: colXs[j], y, w: colWs[j], h: rowH,
        fill: { color: j === 4 ? C.accentSoft : stripe }, line: { color: C.rule, width: 0.25 },
      });
      s.addText(r[j], {
        x: colXs[j] + 0.15, y, w: colWs[j] - 0.2, h: rowH,
        fontFace: FONT_B, fontSize: 11,
        bold: j === 0 || j === 4,
        color: j === 4 ? C.ink : C.inkSoft, valign: "middle",
      });
    });
  });
}

// ============================================================
// Slide 19 — Deployment & data sovereignty
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "17  ·  Deployment");
  title(
    s,
    "Deployed in the region. Owned by the Ministry.",
    "Three deployment shapes, the same product, the same data model.",
  );

  const opts = [
    {
      t: "Managed cloud",
      tag: "Fastest",
      b: "VaxPlan hosts a dedicated tenant. The Ministry's data lives in a region of its choice (EU, US, Africa). SLA managed by us.",
      pts: ["Up in days", "We patch & upgrade", "Pay per facility per month"],
      color: C.accent,
    },
    {
      t: "Sovereign cloud",
      tag: "Most common",
      b: "Deployed into the Ministry's own cloud account (AWS / Azure / GCP) or a national data centre. Same image, Ministry holds keys.",
      pts: ["Data residency in-country", "Ministry IT keeps root", "Quarterly upgrade cadence"],
      color: C.teal,
    },
    {
      t: "On-premise",
      tag: "Highest control",
      b: "Air-gapped national EPI servers. Releases delivered on signed media. Ideal for sensitive deployments and offline pilots.",
      pts: ["Zero external dependencies", "Field devices sync locally", "Slower upgrade cycle"],
      color: C.amber,
    },
  ];
  const x0 = 0.6, y0 = 2.7, w = 4.05, h = 4.05, gap = 0.15;
  opts.forEach((o, i) => {
    const x = x0 + i * (w + gap);
    card(s, { x, y: y0, w, h });
    s.addShape(pres.ShapeType.rect, {
      x, y: y0, w, h: 0.65, fill: { color: o.color }, line: { type: "none" },
    });
    s.addText(o.t, {
      x: x + 0.25, y: y0 + 0.05, w: w - 1.0, h: 0.55,
      fontFace: FONT_H, fontSize: 17, bold: true, color: "FFFFFF",
    });
    s.addText(o.tag, {
      x: x + w - 1.3, y: y0 + 0.15, w: 1.1, h: 0.35,
      fontFace: FONT_B, fontSize: 9, bold: true, color: o.color,
      fill: { color: "FFFFFF" }, align: "center", valign: "middle", charSpacing: 2,
    });
    s.addText(o.b, {
      x: x + 0.25, y: y0 + 0.85, w: w - 0.5, h: 1.4,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, valign: "top",
    });
    s.addText(o.pts.map((p) => `•  ${p}`).join("\n"), {
      x: x + 0.25, y: y0 + 2.3, w: w - 0.5, h: 1.6,
      fontFace: FONT_B, fontSize: 11.5, color: C.ink, paraSpaceAfter: 4, valign: "top",
    });
  });
}

// ============================================================
// Slide 20 — Pilot roadmap
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "18  ·  Pilot roadmap");
  title(
    s,
    "A six-month pilot to a province-wide rollout.",
    "Concrete, measurable milestones — not a multi-year transformation.",
  );

  const phases = [
    {
      m: "M0 – M1",
      t: "Tenant set-up & data load",
      b: "Spin up the Ministry's tenant. Load national boundaries, facility registry, GRID3 settlements, WorldPop rasters. Configure SSO and the vaccine schedule.",
    },
    {
      m: "M1 – M2",
      t: "Train two pilot districts",
      b: "Train ~40 facility clerks and 6 district managers. Activate offline devices. Co-author the first quarterly microplan in the wizard.",
    },
    {
      m: "M2 – M4",
      t: "Run one full quarter",
      b: "Plan, deliver and review one quarter on VaxPlan. Compare coverage, dropout and zero-dose with the previous baseline.",
    },
    {
      m: "M4 – M5",
      t: "Independent evaluation",
      b: "M&E team reviews coverage, missed communities, supervisory visit completion and user adoption. Publish dashboard to national EPI.",
    },
    {
      m: "M5 – M6",
      t: "Province-wide rollout decision",
      b: "Sign-off by the National EPI Manager. Expand to remaining districts in the pilot province; plan national scale-out for the next fiscal year.",
    },
  ];
  const y0 = 2.7, h = 0.78, gap = 0.1;
  phases.forEach((p, i) => {
    const y = y0 + i * (h + gap);
    card(s, { x: 0.6, y, w: 12.1, h, accent: C.accent });
    s.addText(p.m, {
      x: 0.85, y, w: 1.6, h, fontFace: FONT_H, fontSize: 13, bold: true, color: C.accent, valign: "middle",
    });
    s.addText(p.t, {
      x: 2.55, y, w: 3.6, h, fontFace: FONT_H, fontSize: 13, bold: true, color: C.ink, valign: "middle",
    });
    s.addShape(pres.ShapeType.line, {
      x: 6.2, y: y + 0.1, w: 0, h: h - 0.2, line: { color: C.rule, width: 0.5 },
    });
    s.addText(p.b, {
      x: 6.4, y, w: 6.2, h, fontFace: FONT_B, fontSize: 11.5, color: C.inkSoft, valign: "middle",
    });
  });
}

// ============================================================
// Slide 21 — Investment / commercials
// ============================================================
{
  const s = slide();
  chrome(s, page, TOTAL, "19  ·  Investment");
  title(
    s,
    "Predictable cost. Proportional to the system, not the licences.",
    "Pricing follows the number of facilities served, not seat counts — so adding a clerk never costs a Ministry money.",
  );

  // Three tiers
  const tiers = [
    {
      name: "Pilot",
      sub: "Up to 2 districts · 6 months",
      price: "Fixed", priceSub: "fee-for-service",
      bullets: [
        "Tenant set-up and data load",
        "Training for 40 users",
        "One quarterly cycle supported",
        "Independent evaluation included",
      ],
      color: C.accent,
    },
    {
      name: "Province",
      sub: "Up to 200 facilities · annual",
      price: "$", priceSub: "per facility / month",
      bullets: [
        "Unlimited users in tenant",
        "Managed or sovereign cloud",
        "9 × 5 support, 1 business day SLA",
        "Quarterly product upgrades",
      ],
      color: C.teal,
    },
    {
      name: "National",
      sub: "Country-wide · multi-year",
      price: "$$", priceSub: "per facility / month, tiered",
      bullets: [
        "On-prem option, signed releases",
        "24 × 7 critical-incident support",
        "Custom HIS adapters (DHIS2, eLMIS)",
        "Joint roadmap with EPI manager",
      ],
      color: C.amber,
    },
  ];
  const x0 = 0.6, y0 = 2.7, w = 4.05, h = 4.05, gap = 0.15;
  tiers.forEach((t, i) => {
    const x = x0 + i * (w + gap);
    card(s, { x, y: y0, w, h });
    s.addShape(pres.ShapeType.rect, {
      x, y: y0, w, h: 0.85, fill: { color: t.color }, line: { type: "none" },
    });
    s.addText(t.name, {
      x: x + 0.25, y: y0 + 0.05, w: w - 0.5, h: 0.45,
      fontFace: FONT_H, fontSize: 18, bold: true, color: "FFFFFF",
    });
    s.addText(t.sub, {
      x: x + 0.25, y: y0 + 0.5, w: w - 0.5, h: 0.3,
      fontFace: FONT_B, fontSize: 10, color: "FFFFFF",
    });
    s.addText(t.price, {
      x: x + 0.25, y: y0 + 1.0, w: w - 0.5, h: 0.6,
      fontFace: FONT_H, fontSize: 28, bold: true, color: C.ink,
    });
    s.addText(t.priceSub, {
      x: x + 0.25, y: y0 + 1.65, w: w - 0.5, h: 0.3,
      fontFace: FONT_B, fontSize: 10, color: C.inkSoft,
    });
    s.addText(t.bullets.map((b) => `•  ${b}`).join("\n"), {
      x: x + 0.25, y: y0 + 2.1, w: w - 0.5, h: 1.85,
      fontFace: FONT_B, fontSize: 11.5, color: C.ink, paraSpaceAfter: 4, valign: "top",
    });
  });
}

// ============================================================
// Slide 22 — Call to action / close
// ============================================================
{
  const s = slide();
  s.background = { color: C.ink };
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 0.35, h: SLIDE_H, fill: { color: C.accent }, line: { type: "none" },
  });
  s.addText("Reach every child.", {
    x: 0.9, y: 2.0, w: 12, h: 1.1,
    fontFace: FONT_H, fontSize: 56, bold: true, color: "FFFFFF",
  });
  s.addText("Plan every session.", {
    x: 0.9, y: 3.0, w: 12, h: 1.1,
    fontFace: FONT_H, fontSize: 56, bold: true, color: C.accent,
  });
  s.addShape(pres.ShapeType.line, {
    x: 0.95, y: 4.3, w: 1.5, h: 0, line: { color: C.accent, width: 2.5 },
  });
  s.addText(
    "Next step: a 60-minute working session with your national EPI lead and GIS focal point to scope a pilot province.",
    {
      x: 0.95, y: 4.6, w: 11.5, h: 1.0,
      fontFace: FONT_B, fontSize: 18, color: "DDE6F5",
    },
  );
  s.addText("contact@vaxplan.health  ·  vaxplan.health", {
    x: 0.95, y: 6.5, w: 11, h: 0.4,
    fontFace: FONT_H, fontSize: 14, color: "9FB4D6", charSpacing: 4,
  });
}

// Save
const OUT = "exports/VaxPlan-Stakeholder-Briefing.pptx";
await pres.writeFile({ fileName: OUT });
console.log(`Wrote ${OUT} — ${page} slides.`);
