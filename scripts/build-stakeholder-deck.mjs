import PptxGenJS from "pptxgenjs";

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in, 16:9
pres.title = "VaxPlan — Stakeholder Briefing";
pres.author = "VaxPlan";
pres.company = "VaxPlan";

// ---- Design tokens ----
const C = {
  ink: "0B1F3A",       // deep navy
  inkSoft: "31466B",   // muted navy for body
  paper: "F5F7FB",     // off-white background
  panel: "FFFFFF",     // card surface
  accent: "1F6FEB",    // VaxPlan blue
  accentSoft: "DCE8FB",
  teal: "0F766E",
  amber: "B45309",
  rose: "B91C1C",
  rule: "C9D3E2",
};
const FONT_H = "Calibri";
const FONT_B = "Calibri";

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

// ---- Helpers ----
function addBackground(slide) {
  slide.background = { color: C.paper };
}

function addHeaderBar(slide, pageNum, totalPages, section) {
  // thin accent rule top-left
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

const TOTAL = 14;

// ============================================================
// Slide 1 — Title
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  // accent block
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 0.35, h: SLIDE_H, fill: { color: C.accent }, line: { type: "none" },
  });
  s.addText("VAXPLAN", {
    x: 0.9, y: 2.3, w: 12, h: 1.3,
    fontFace: FONT_H, fontSize: 72, bold: true, color: "FFFFFF", charSpacing: 12,
  });
  s.addText("A multitenant GIS microplanning platform for national immunisation programmes.", {
    x: 0.95, y: 3.6, w: 11.5, h: 0.9,
    fontFace: FONT_B, fontSize: 22, color: "DDE6F5",
  });
  s.addShape(pres.ShapeType.line, {
    x: 0.95, y: 4.7, w: 1.5, h: 0, line: { color: C.accent, width: 2.5 },
  });
  s.addText("Stakeholder briefing  ·  2026", {
    x: 0.95, y: 4.85, w: 10, h: 0.4,
    fontFace: FONT_B, fontSize: 14, color: "9FB4D6", charSpacing: 6,
  });
  s.addText("Plan vaccination sessions where they're needed — even offline.", {
    x: 0.95, y: 6.4, w: 11, h: 0.45,
    fontFace: FONT_H, fontSize: 16, italic: true, color: "9FB4D6",
  });
}

// ============================================================
// Slide 2 — The Problem
// ============================================================
{
  const s = pres.addSlide();
  chrome(s, 2, TOTAL, "01  ·  The challenge");
  s.addText("Microplanning is still done on paper.", {
    x: 0.6, y: 0.95, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 36, bold: true, color: C.ink,
  });
  s.addText("National immunisation programmes lose accuracy, time, and coverage at every step.", {
    x: 0.6, y: 1.95, w: 12, h: 0.5,
    fontFace: FONT_B, fontSize: 16, color: C.inkSoft,
  });

  const cards = [
    {
      t: "Stale population data",
      b: "Catchment populations are recopied each quarter from outdated registers, drifting further from reality with every cycle.",
    },
    {
      t: "No spatial picture",
      b: "Plans are tables in workbooks. Health workers can't see which villages are far from a facility or which were missed last round.",
    },
    {
      t: "Broken reporting loops",
      b: "Submissions move by photo, email and WhatsApp. District and provincial review rarely closes within the quarter.",
    },
    {
      t: "Offline-blind tools",
      b: "Generic dashboards assume connectivity. Field staff in the last mile cannot use them where it matters most.",
    },
  ];
  const x0 = 0.6, y0 = 2.85, w = 5.95, h = 1.7, gap = 0.25;
  cards.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = x0 + col * (w + gap);
    const y = y0 + row * (h + gap);
    s.addShape(pres.ShapeType.rect, {
      x, y, w, h, fill: { color: C.panel }, line: { color: C.rule, width: 0.5 },
    });
    s.addShape(pres.ShapeType.rect, {
      x, y, w: 0.08, h, fill: { color: C.accent }, line: { type: "none" },
    });
    s.addText(c.t, {
      x: x + 0.3, y: y + 0.2, w: w - 0.5, h: 0.45,
      fontFace: FONT_H, fontSize: 16, bold: true, color: C.ink,
    });
    s.addText(c.b, {
      x: x + 0.3, y: y + 0.7, w: w - 0.5, h: 0.9,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 3 — Vision
// ============================================================
{
  const s = pres.addSlide();
  chrome(s, 3, TOTAL, "02  ·  Vision");
  s.addText("One platform. Every facility. Every quarter.", {
    x: 0.6, y: 0.95, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 36, bold: true, color: C.ink,
  });
  s.addText(
    "VaxPlan gives Ministries of Health a shared, map-first workspace for routine immunisation and campaign planning — designed for the realities of the last mile.",
    { x: 0.6, y: 1.95, w: 12, h: 1.2, fontFace: FONT_B, fontSize: 17, color: C.inkSoft }
  );

  // pillars
  const pillars = [
    { t: "Map-driven", b: "Catchments, villages and sessions on one interactive map." },
    { t: "Offline-first", b: "Built for low-connectivity facilities; sync when online." },
    { t: "Multitenant", b: "Each Ministry runs its own tenant with its own data and SSO." },
    { t: "Accountable", b: "Hierarchical approvals from facility to national." },
  ];
  const y = 3.7, h = 2.7, w = 2.95, gap = 0.2, x0 = 0.6;
  pillars.forEach((p, i) => {
    const x = x0 + i * (w + gap);
    s.addShape(pres.ShapeType.rect, {
      x, y, w, h, fill: { color: C.panel }, line: { color: C.rule, width: 0.5 },
    });
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
      x: x + 0.3, y: y + 1.55, w: w - 0.5, h: 1.0,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 4 — Who we serve
// ============================================================
{
  const s = pres.addSlide();
  chrome(s, 4, TOTAL, "03  ·  Stakeholders");
  s.addText("Built around the people who run immunisation.", {
    x: 0.6, y: 0.95, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 32, bold: true, color: C.ink,
  });
  s.addText(
    "Each role sees only what it needs, with permissions and visibility scoped to its level in the health system.",
    { x: 0.6, y: 1.85, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 15, color: C.inkSoft }
  );

  // Table-like role rows
  const rows = [
    ["Facility clerk / in-charge", "Author microplans, run sessions, log defaulters, submit for review."],
    ["District manager", "Review and approve facility microplans, monitor coverage by catchment."],
    ["Provincial manager", "Aggregate district performance, escalate gaps, allocate supervisory visits."],
    ["National admin", "Configure schedules, tenants, SSO and reporting; approve national plans."],
    ["Donors & partners", "Read-only visibility into approved plans, coverage and supply needs."],
  ];
  const y0 = 2.9, h = 0.7, gap = 0.1;
  rows.forEach((r, i) => {
    const y = y0 + i * (h + gap);
    s.addShape(pres.ShapeType.rect, {
      x: 0.6, y, w: 12.1, h, fill: { color: C.panel }, line: { color: C.rule, width: 0.5 },
    });
    s.addText(r[0], {
      x: 0.85, y, w: 3.5, h, fontFace: FONT_H, fontSize: 14, bold: true, color: C.ink, valign: "middle",
    });
    s.addShape(pres.ShapeType.line, {
      x: 4.45, y: y + 0.15, w: 0, h: h - 0.3, line: { color: C.rule, width: 0.5 },
    });
    s.addText(r[1], {
      x: 4.7, y, w: 7.9, h, fontFace: FONT_B, fontSize: 12, color: C.inkSoft, valign: "middle",
    });
  });
}

// ============================================================
// Slide 5 — Core capabilities
// ============================================================
{
  const s = pres.addSlide();
  chrome(s, 5, TOTAL, "04  ·  Capabilities");
  s.addText("What VaxPlan does end to end.", {
    x: 0.6, y: 0.95, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 32, bold: true, color: C.ink,
  });

  const caps = [
    { t: "Facility & village registry", b: "Authoritative records with geo-coordinates, drawn catchments and population." },
    { t: "Microplan wizard", b: "Ten-step routine and campaign planning, with auto-saved drafts and resumable sessions." },
    { t: "Vaccine requirements", b: "Per-antigen forecasting against the tenant's full schedule, with wastage factors." },
    { t: "Session execution", b: "Mark-done with per-antigen counts, defaulter capture and offline outbox." },
    { t: "Supervisory visits", b: "Quarterly visits seeded automatically when a microplan is approved." },
    { t: "Approvals & audit", b: "Hierarchical review chain, full audit log, cross-tenant write protection." },
  ];
  const x0 = 0.6, y0 = 2.1, w = 3.95, h = 2.1, gx = 0.2, gy = 0.25;
  caps.forEach((c, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = x0 + col * (w + gx);
    const y = y0 + row * (h + gy);
    s.addShape(pres.ShapeType.rect, {
      x, y, w, h, fill: { color: C.panel }, line: { color: C.rule, width: 0.5 },
    });
    s.addShape(pres.ShapeType.rect, {
      x, y, w, h: 0.08, fill: { color: C.accent }, line: { type: "none" },
    });
    s.addText(c.t, {
      x: x + 0.3, y: y + 0.3, w: w - 0.5, h: 0.6,
      fontFace: FONT_H, fontSize: 15, bold: true, color: C.ink,
    });
    s.addText(c.b, {
      x: x + 0.3, y: y + 0.95, w: w - 0.5, h: 1.1,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 6 — Map-driven planning
// ============================================================
{
  const s = pres.addSlide();
  chrome(s, 6, TOTAL, "05  ·  Map-driven planning");
  s.addText("The map is the plan.", {
    x: 0.6, y: 0.95, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 36, bold: true, color: C.ink,
  });
  s.addText(
    "Health workers draw catchment areas, click a village to start a session, and see live coverage as sessions are reported.",
    { x: 0.6, y: 1.95, w: 12, h: 0.7, fontFace: FONT_B, fontSize: 16, color: C.inkSoft }
  );

  // Left: stylized map panel
  s.addShape(pres.ShapeType.rect, {
    x: 0.6, y: 2.9, w: 6.6, h: 3.9, fill: { color: "E9F0FA" }, line: { color: C.rule, width: 0.5 },
  });
  // catchments
  s.addShape(pres.ShapeType.ellipse, {
    x: 1.0, y: 3.2, w: 2.6, h: 2.0, fill: { color: "BFD6F4", transparency: 35 },
    line: { color: C.accent, width: 1.2 },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: 3.4, y: 4.0, w: 2.4, h: 1.9, fill: { color: "BFD6F4", transparency: 35 },
    line: { color: C.accent, width: 1.2 },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: 4.7, y: 3.1, w: 2.0, h: 1.5, fill: { color: "BFD6F4", transparency: 35 },
    line: { color: C.accent, width: 1.2 },
  });
  // village pins
  const pins = [
    [1.6, 3.6], [2.6, 4.3], [3.0, 3.5], [4.0, 4.6], [4.6, 4.2],
    [5.2, 3.5], [5.7, 4.4], [6.2, 3.8],
  ];
  pins.forEach(([px, py]) => {
    s.addShape(pres.ShapeType.ellipse, {
      x: px - 0.08, y: py - 0.08, w: 0.18, h: 0.18,
      fill: { color: C.amber }, line: { color: "FFFFFF", width: 0.8 },
    });
  });
  s.addText("Catchments  ·  Villages  ·  Sessions", {
    x: 0.85, y: 6.4, w: 6, h: 0.3,
    fontFace: FONT_B, fontSize: 10, color: C.inkSoft, italic: true,
  });

  // Right: bullet rail
  const items = [
    ["Draw a catchment", "Polygon directly on satellite or street base map; area and estimated population auto-computed."],
    ["Start from a village", "Click a village pin to open a prefilled session plan for that location."],
    ["See coverage live", "Sessions turn from amber to green as facility teams mark them done."],
    ["Spot the gaps", "Hard-to-reach scores highlight villages that need outreach this quarter."],
  ];
  const xb = 7.4, yb0 = 2.9, ib = 0.9;
  items.forEach((it, i) => {
    const y = yb0 + i * ib;
    s.addShape(pres.ShapeType.ellipse, {
      x: xb, y: y + 0.12, w: 0.22, h: 0.22, fill: { color: C.accent }, line: { type: "none" },
    });
    s.addText(it[0], {
      x: xb + 0.4, y, w: 5.5, h: 0.35,
      fontFace: FONT_H, fontSize: 14, bold: true, color: C.ink,
    });
    s.addText(it[1], {
      x: xb + 0.4, y: y + 0.35, w: 5.5, h: 0.55,
      fontFace: FONT_B, fontSize: 11, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 7 — Offline-first
// ============================================================
{
  const s = pres.addSlide();
  chrome(s, 7, TOTAL, "06  ·  Offline-first");
  s.addText("Built for the last mile.", {
    x: 0.6, y: 0.95, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 36, bold: true, color: C.ink,
  });
  s.addText(
    "Health workers can plan and run sessions for days without connectivity. The platform reconciles everything when they come back online.",
    { x: 0.6, y: 1.95, w: 12, h: 0.8, fontFace: FONT_B, fontSize: 16, color: C.inkSoft }
  );

  const steps = [
    { n: "01", t: "Download", b: "Facility data, schedules and last-quarter coverage cached on the device." },
    { n: "02", t: "Plan & run", b: "Wizard, map and mark-done all work offline; entries queue into an outbox." },
    { n: "03", t: "Sync", b: "On reconnect, the outbox replays; unknown antigen codes are preserved, not dropped." },
    { n: "04", t: "Reconcile", b: "Server canonicalises codes, audits stale entries and surfaces warnings to the user." },
  ];
  const x0 = 0.6, y0 = 3.1, w = 2.95, h = 3.4, gap = 0.2;
  steps.forEach((st, i) => {
    const x = x0 + i * (w + gap);
    s.addShape(pres.ShapeType.rect, {
      x, y: y0, w, h, fill: { color: C.panel }, line: { color: C.rule, width: 0.5 },
    });
    s.addText(st.n, {
      x: x + 0.3, y: y0 + 0.3, w: w - 0.5, h: 0.55,
      fontFace: FONT_H, fontSize: 26, bold: true, color: C.accentSoft, charSpacing: 4,
    });
    s.addText(st.t, {
      x: x + 0.3, y: y0 + 1.0, w: w - 0.5, h: 0.5,
      fontFace: FONT_H, fontSize: 18, bold: true, color: C.ink,
    });
    s.addShape(pres.ShapeType.line, {
      x: x + 0.3, y: y0 + 1.55, w: 0.8, h: 0, line: { color: C.accent, width: 1.6 },
    });
    s.addText(st.b, {
      x: x + 0.3, y: y0 + 1.75, w: w - 0.5, h: 1.5,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 8 — Multitenant SaaS
// ============================================================
{
  const s = pres.addSlide();
  chrome(s, 8, TOTAL, "07  ·  Multitenant SaaS");
  s.addText("One platform, many ministries.", {
    x: 0.6, y: 0.95, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 32, bold: true, color: C.ink,
  });
  s.addText(
    "Each tenant gets its own data, identity, vaccine schedule and approval hierarchy. Cross-tenant browsing is read-only, by design.",
    { x: 0.6, y: 1.85, w: 12, h: 0.7, fontFace: FONT_B, fontSize: 15, color: C.inkSoft }
  );

  const items = [
    { t: "Tenant isolation", b: "Every domain table is tenant-scoped. Writes outside the user's home tenant are rejected by a guard." },
    { t: "Per-tenant SSO", b: "OIDC and SAML configurations per Ministry; domain-based home-tenant resolution." },
    { t: "Self-service onboarding", b: "Signup with hierarchical approval; sandbox tenant available for evaluation." },
    { t: "Country switcher", b: "Authenticated users can view other tenants for coordination, never modify them." },
    { t: "Tenant-specific schedules", b: "Vaccine schedules and antigen codes follow each Ministry's national policy." },
    { t: "Audit everywhere", b: "Every state change is logged with actor, tenant, before and after values." },
  ];
  const x0 = 0.6, y0 = 2.85, w = 3.95, h = 2.0, gx = 0.2, gy = 0.2;
  items.forEach((c, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = x0 + col * (w + gx);
    const y = y0 + row * (h + gy);
    s.addShape(pres.ShapeType.rect, {
      x, y, w, h, fill: { color: C.panel }, line: { color: C.rule, width: 0.5 },
    });
    s.addText(c.t, {
      x: x + 0.25, y: y + 0.2, w: w - 0.4, h: 0.5,
      fontFace: FONT_H, fontSize: 14, bold: true, color: C.ink,
    });
    s.addShape(pres.ShapeType.line, {
      x: x + 0.25, y: y + 0.75, w: 0.7, h: 0, line: { color: C.accent, width: 1.4 },
    });
    s.addText(c.b, {
      x: x + 0.25, y: y + 0.9, w: w - 0.4, h: 1.0,
      fontFace: FONT_B, fontSize: 11, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 9 — Governance & approvals
// ============================================================
{
  const s = pres.addSlide();
  chrome(s, 9, TOTAL, "08  ·  Governance");
  s.addText("Approvals walk the same path as the paper plan.", {
    x: 0.6, y: 0.95, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 30, bold: true, color: C.ink,
  });
  s.addText(
    "Microplans, session reports, population data and budgets all share one approval workflow. Reviewers see what changed; rejections roll back side effects.",
    { x: 0.6, y: 1.85, w: 12, h: 0.9, fontFace: FONT_B, fontSize: 15, color: C.inkSoft }
  );

  // Horizontal pipeline
  const stages = ["Facility", "District", "Provincial", "National", "Approved"];
  const y = 4.0, h = 1.0, n = stages.length;
  const totalW = 11.5, gap = 0.25;
  const w = (totalW - gap * (n - 1)) / n;
  const x0 = 0.9;
  stages.forEach((st, i) => {
    const x = x0 + i * (w + gap);
    const isLast = i === n - 1;
    s.addShape(pres.ShapeType.rect, {
      x, y, w, h, fill: { color: isLast ? C.teal : C.panel }, line: { color: isLast ? C.teal : C.accent, width: 1.2 },
    });
    s.addText(st, {
      x, y, w, h,
      fontFace: FONT_H, fontSize: 16, bold: true,
      color: isLast ? "FFFFFF" : C.ink, align: "center", valign: "middle",
    });
    if (!isLast) {
      const ax = x + w + 0.04;
      s.addText("›", {
        x: ax, y: y, w: 0.2, h: h,
        fontFace: FONT_H, fontSize: 22, bold: true, color: C.accent,
        align: "center", valign: "middle",
      });
    }
  });

  // Notes below
  const notes = [
    { t: "Side-effect parity", b: "Approving a microplan auto-seeds quarterly supervisory visits. Rejecting it cancels them." },
    { t: "Role-aware authoring", b: "Only facility staff author microplans. District and above are reviewers, never authors." },
    { t: "Tenant-scoped review", b: "Reviewers only see requests for their own tenant; cross-tenant submissions are blocked." },
  ];
  notes.forEach((n, i) => {
    const x = 0.6 + i * 4.15, y = 5.5;
    s.addText(n.t, {
      x, y, w: 3.9, h: 0.4,
      fontFace: FONT_H, fontSize: 13, bold: true, color: C.ink,
    });
    s.addText(n.b, {
      x, y: y + 0.4, w: 3.9, h: 1.1,
      fontFace: FONT_B, fontSize: 11, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 10 — What we measure (KPIs)
// ============================================================
{
  const s = pres.addSlide();
  chrome(s, 10, TOTAL, "09  ·  Impact metrics");
  s.addText("How we know it's working.", {
    x: 0.6, y: 0.95, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 36, bold: true, color: C.ink,
  });
  s.addText(
    "Stakeholders track four families of metrics. Each one is reported per facility, district, province and tenant.",
    { x: 0.6, y: 1.95, w: 12, h: 0.6, fontFace: FONT_B, fontSize: 15, color: C.inkSoft }
  );

  const k = [
    { l: "Coverage", v: "Per antigen", d: "Vaccinated children divided by target population, by quarter." },
    { l: "Plan adherence", v: "Sessions", d: "Held versus planned, with reasons captured for missed sessions." },
    { l: "Reach", v: "Villages", d: "Share of registered villages served at least once in the quarter." },
    { l: "Defaulters", v: "Tracked", d: "Children with missed doses, surfaced for catch-up planning." },
  ];
  const x0 = 0.6, y0 = 3.0, w = 2.95, h = 3.6, gap = 0.2;
  k.forEach((kk, i) => {
    const x = x0 + i * (w + gap);
    s.addShape(pres.ShapeType.rect, {
      x, y: y0, w, h, fill: { color: C.panel }, line: { color: C.rule, width: 0.5 },
    });
    s.addText(kk.l, {
      x: x + 0.25, y: y0 + 0.3, w: w - 0.4, h: 0.45,
      fontFace: FONT_H, fontSize: 13, color: C.inkSoft, charSpacing: 6, bold: true,
    });
    s.addText(kk.v, {
      x: x + 0.25, y: y0 + 0.85, w: w - 0.4, h: 1.3,
      fontFace: FONT_H, fontSize: 36, bold: true, color: C.accent,
    });
    s.addShape(pres.ShapeType.line, {
      x: x + 0.25, y: y0 + 2.25, w: 0.7, h: 0, line: { color: C.accent, width: 1.6 },
    });
    s.addText(kk.d, {
      x: x + 0.25, y: y0 + 2.45, w: w - 0.4, h: 1.0,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 11 — Where we are deployed
// ============================================================
{
  const s = pres.addSlide();
  chrome(s, 11, TOTAL, "10  ·  Footprint");
  s.addText("From one country to many.", {
    x: 0.6, y: 0.95, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 36, bold: true, color: C.ink,
  });
  s.addText(
    "VaxPlan began as the national microplanning system for Papua New Guinea. The multitenant architecture is now opening it to other Ministries of Health.",
    { x: 0.6, y: 1.95, w: 12, h: 0.9, fontFace: FONT_B, fontSize: 15, color: C.inkSoft }
  );

  const stages = [
    { tag: "Live", t: "Papua New Guinea", b: "National rollout in progress; provincial, district and facility tiers active." },
    { tag: "Onboarding", t: "Zambia", b: "Tenant configured, vaccine schedule loaded, facility registry in import." },
    { tag: "Pipeline", t: "South Sudan", b: "Discovery with the Ministry of Health and partner agencies." },
    { tag: "Open", t: "Your country next", b: "Self-service signup with sandbox tenant for evaluation." },
  ];
  const x0 = 0.6, y0 = 3.1, w = 2.95, h = 3.4, gap = 0.2;
  const tagColors = [C.teal, C.accent, C.amber, C.inkSoft];
  stages.forEach((st, i) => {
    const x = x0 + i * (w + gap);
    s.addShape(pres.ShapeType.rect, {
      x, y: y0, w, h, fill: { color: C.panel }, line: { color: C.rule, width: 0.5 },
    });
    // tag pill
    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.25, y: y0 + 0.3, w: 1.4, h: 0.4,
      fill: { color: tagColors[i] }, line: { type: "none" }, rectRadius: 0.05,
    });
    s.addText(st.tag.toUpperCase(), {
      x: x + 0.25, y: y0 + 0.3, w: 1.4, h: 0.4,
      fontFace: FONT_H, fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle", charSpacing: 4,
    });
    s.addText(st.t, {
      x: x + 0.25, y: y0 + 0.95, w: w - 0.4, h: 0.6,
      fontFace: FONT_H, fontSize: 18, bold: true, color: C.ink,
    });
    s.addShape(pres.ShapeType.line, {
      x: x + 0.25, y: y0 + 1.6, w: 0.8, h: 0, line: { color: C.accent, width: 1.6 },
    });
    s.addText(st.b, {
      x: x + 0.25, y: y0 + 1.8, w: w - 0.4, h: 1.4,
      fontFace: FONT_B, fontSize: 12, color: C.inkSoft, valign: "top",
    });
  });
}

// ============================================================
// Slide 12 — Architecture (lightweight)
// ============================================================
{
  const s = pres.addSlide();
  chrome(s, 12, TOTAL, "11  ·  How it's built");
  s.addText("A modern, defensible stack.", {
    x: 0.6, y: 0.95, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 32, bold: true, color: C.ink,
  });
  s.addText(
    "Open standards, isolated tenants, audited data. Designed for ministries that need confidence in what they deploy.",
    { x: 0.6, y: 1.85, w: 12, h: 0.7, fontFace: FONT_B, fontSize: 15, color: C.inkSoft }
  );

  const rows = [
    ["Mobile & web client", "React, TypeScript, offline cache, Leaflet maps, mobile-first UI."],
    ["API & business logic", "Node and TypeScript, role-aware authorisation, full audit logging."],
    ["Data", "PostgreSQL with tenant-scoped tables and managed migrations."],
    ["Identity", "OpenID Connect today; per-tenant SAML and OIDC on the multitenant track."],
    ["Geospatial", "Drawn and official catchments, Turf.js calculations, OpenStreetMap base layer."],
    ["Operations", "Hosted on Replit, with environment-isolated secrets and one-click deploys."],
  ];
  const y0 = 2.9, h = 0.62, gap = 0.08;
  rows.forEach((r, i) => {
    const y = y0 + i * (h + gap);
    s.addShape(pres.ShapeType.rect, {
      x: 0.6, y, w: 12.1, h, fill: { color: C.panel }, line: { color: C.rule, width: 0.5 },
    });
    s.addShape(pres.ShapeType.rect, {
      x: 0.6, y, w: 0.08, h, fill: { color: C.accent }, line: { type: "none" },
    });
    s.addText(r[0], {
      x: 0.9, y, w: 3.4, h, fontFace: FONT_H, fontSize: 13, bold: true, color: C.ink, valign: "middle",
    });
    s.addShape(pres.ShapeType.line, {
      x: 4.45, y: y + 0.12, w: 0, h: h - 0.24, line: { color: C.rule, width: 0.5 },
    });
    s.addText(r[1], {
      x: 4.7, y, w: 7.9, h, fontFace: FONT_B, fontSize: 12, color: C.inkSoft, valign: "middle",
    });
  });
}

// ============================================================
// Slide 13 — Roadmap
// ============================================================
{
  const s = pres.addSlide();
  chrome(s, 13, TOTAL, "12  ·  Roadmap");
  s.addText("Where we go next.", {
    x: 0.6, y: 0.95, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 36, bold: true, color: C.ink,
  });
  s.addText(
    "A focused roadmap, sequenced around what stakeholders have asked for.",
    { x: 0.6, y: 1.95, w: 12, h: 0.5, fontFace: FONT_B, fontSize: 15, color: C.inkSoft }
  );

  const cols = [
    {
      h: "Now", color: C.teal, items: [
        "Multitenant signup and SSO",
        "Approval workflow for microplans",
        "Offline-safe mark-done and sync",
      ]
    },
    {
      h: "Next", color: C.accent, items: [
        "Native mobile apps for Android",
        "Coverage dashboards per antigen",
        "Catch-up planning for defaulters",
      ]
    },
    {
      h: "Later", color: C.amber, items: [
        "Integrations with DHIS2 and HMIS",
        "Supply chain and cold-chain linkage",
        "Multilingual UI and reports",
      ]
    },
  ];
  const x0 = 0.6, y0 = 3.0, w = 4.05, h = 3.6, gap = 0.2;
  cols.forEach((c, i) => {
    const x = x0 + i * (w + gap);
    s.addShape(pres.ShapeType.rect, {
      x, y: y0, w, h, fill: { color: C.panel }, line: { color: C.rule, width: 0.5 },
    });
    // header band
    s.addShape(pres.ShapeType.rect, {
      x, y: y0, w, h: 0.7, fill: { color: c.color }, line: { type: "none" },
    });
    s.addText(c.h.toUpperCase(), {
      x: x + 0.3, y: y0, w: w - 0.5, h: 0.7,
      fontFace: FONT_H, fontSize: 16, bold: true, color: "FFFFFF",
      valign: "middle", charSpacing: 6,
    });
    // items (statically written, no loops at runtime — listed individually)
    c.items.forEach((it, j) => {
      const iy = y0 + 0.95 + j * 0.75;
      s.addShape(pres.ShapeType.ellipse, {
        x: x + 0.3, y: iy + 0.12, w: 0.14, h: 0.14,
        fill: { color: c.color }, line: { type: "none" },
      });
      s.addText(it, {
        x: x + 0.55, y: iy, w: w - 0.8, h: 0.6,
        fontFace: FONT_B, fontSize: 13, color: C.ink, valign: "top",
      });
    });
  });
}

// ============================================================
// Slide 14 — Closing / Call to action
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: C.ink };
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: SLIDE_H - 0.4, w: SLIDE_W, h: 0.4, fill: { color: C.accent }, line: { type: "none" },
  });
  s.addText("Partner with us.", {
    x: 0.95, y: 2.1, w: 12, h: 1.4,
    fontFace: FONT_H, fontSize: 64, bold: true, color: "FFFFFF",
  });
  s.addText(
    "If you run, fund or support an immunisation programme, we'd like to show you VaxPlan in your own data.",
    { x: 0.95, y: 3.6, w: 11, h: 1.0, fontFace: FONT_B, fontSize: 20, color: "C9D6EC" }
  );

  // CTA boxes
  const cta = [
    { t: "Evaluate", b: "Spin up a sandbox tenant in minutes and import a sample facility list." },
    { t: "Pilot", b: "Run a province-scale pilot for one quarter, with us alongside your team." },
    { t: "Scale", b: "National rollout with SSO, training and support handover to your staff." },
  ];
  const x0 = 0.95, y0 = 5.0, w = 3.85, h = 1.7, gap = 0.2;
  cta.forEach((c, i) => {
    const x = x0 + i * (w + gap);
    s.addShape(pres.ShapeType.rect, {
      x, y: y0, w, h, fill: { color: "12294A" }, line: { color: C.accent, width: 0.8 },
    });
    s.addText(c.t.toUpperCase(), {
      x: x + 0.3, y: y0 + 0.2, w: w - 0.5, h: 0.4,
      fontFace: FONT_H, fontSize: 14, bold: true, color: C.accent, charSpacing: 6,
    });
    s.addText(c.b, {
      x: x + 0.3, y: y0 + 0.7, w: w - 0.5, h: 0.9,
      fontFace: FONT_B, fontSize: 12, color: "C9D6EC", valign: "top",
    });
  });

  s.addText("VaxPlan  ·  vaxplan.health", {
    x: 0.95, y: SLIDE_H - 1.0, w: 11, h: 0.4,
    fontFace: FONT_H, fontSize: 12, color: "C9D6EC", charSpacing: 6,
  });
}

const outPath = "exports/VaxPlan-Stakeholder-Briefing.pptx";
await pres.writeFile({ fileName: outPath });
console.log("Wrote", outPath);
