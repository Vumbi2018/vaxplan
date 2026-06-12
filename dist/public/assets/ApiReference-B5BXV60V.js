import{bg as N,z as C,A as p,aO as A,aP as I,aj as P,cl as z,cb as q,j as e,dd as D,bv as G,an as n,ao as o,bT as y,a9 as L,bS as O,U as v,Q as m,ba as u}from"./index-Ciq76Cxi.js";import{L as _}from"./lock-Nld9roTh.js";import{C as M}from"./code-xml-BKLUt7B3.js";/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=N("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=N("Key",[["path",{d:"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4",key:"g0fldk"}],["path",{d:"m21 2-9.6 9.6",key:"1j0ho8"}],["circle",{cx:"7.5",cy:"15.5",r:"5.5",key:"yqb3hr"}]]),j=[{id:"auth",title:"System & Authentication",icon:R,description:"Session tokens, device authentication for offline mobile sync, and platform stats.",endpoints:[{method:"GET",path:"/api/auth/user",auth:"Authenticated",description:"Fetch the active user profile session, including roles, tenant details, and specific granular permissions.",responseExample:`{
  "success": true,
  "data": {
    "id": 42,
    "firstName": "Dr. Sarah",
    "lastName": "Chola",
    "email": "sarah.chola@moh.gov.zm",
    "role": "provincial_coordinator",
    "provinceId": 3,
    "districtId": null,
    "facilityId": null,
    "tenantId": "tenant-zm-north",
    "permissions": ["view_reports", "approve_microplans", "manage_users"]
  }
}`},{method:"POST",path:"/api/auth/device-token",auth:"Authenticated",description:"Request a highly secure cryptographically signed API/device token used to authorize the offline Android client. Tokens are private and should be kept secure.",requestExample:`{
  "deviceName": "Zebra TC26 Handheld",
  "purpose": "Routine Outreach Syncing"
}`,responseExample:`{
  "success": true,
  "data": {
    "tokenId": "tok_8f93a921",
    "tokenString": "vp_sec_7a2b9d4e1f83c09b882a...[truncated]",
    "createdAt": "2026-06-02T16:00:00.000Z",
    "expiresAt": "2027-06-02T16:00:00.000Z"
  }
}`},{method:"GET",path:"/api/stats",auth:"Authenticated",description:"Aggregates overall tenant metrics for the dashboard, including total zero-dose children mapped, defaulters, session completion percentage, and active microplans.",responseExample:`{
  "success": true,
  "data": {
    "totalZeroDose": 1284,
    "totalDefaulters": 642,
    "activeMicroplansCount": 8,
    "sessionCompletionRate": 78.4,
    "totalImmunizedThisMonth": 4812
  }
}`}]},{id:"geo",title:"Geography & Facilities",icon:A,description:"Hierarchical administrative bounds mapping: Province → District → Health Facility.",endpoints:[{method:"GET",path:"/api/provinces",auth:"Authenticated",description:"Lists all provinces in the country onboarding scope for the active tenant.",responseExample:`{
  "success": true,
  "data": [
    { "id": 1, "name": "Northern Province" },
    { "id": 2, "name": "Southern Province" }
  ]
}`},{method:"GET",path:"/api/districts",auth:"Authenticated",description:"Lists districts. Returns all districts or filters them by parent province.",params:[{name:"provinceId",type:"number",required:!1,description:"Filter districts belonging to a specific province"}],responseExample:`{
  "success": true,
  "data": [
    { "id": 12, "name": "Kasama District", "provinceId": 1 },
    { "id": 13, "name": "Mbala District", "provinceId": 1 }
  ]
}`},{method:"GET",path:"/api/facilities",auth:"Authenticated",description:"Retrieves health facilities. Projects names and locations. Highly cached.",params:[{name:"districtId",type:"number",required:!1,description:"Filter facilities belonging to a specific district"}],responseExample:`{
  "success": true,
  "data": [
    { "id": 104, "name": "Kasama General Hospital", "districtId": 12, "latitude": -10.212, "longitude": 31.181 },
    { "id": 105, "name": "Chiba Urban Clinic", "districtId": 12, "latitude": -10.224, "longitude": 31.195 }
  ]
}`}]},{id:"microplans",title:"Microplanning Engine",icon:I,description:"Target calculations, planning steps, budget summaries, and approval cycles.",endpoints:[{method:"GET",path:"/api/microplans",auth:"Authenticated",description:"Lists all generated microplans for the active user's scope. Projection limits heavy columns for lists.",params:[{name:"status",type:"string",required:!1,description:"Filter by status: 'draft', 'pending_approval', 'approved'"}],responseExample:`{
  "success": true,
  "data": [
    {
      "id": 7,
      "name": "Q3 Routine Outreach Plan - Kasama",
      "status": "pending_approval",
      "planType": "routine",
      "targetPopulation": 14200,
      "createdBy": "sarah.chola",
      "createdAt": "2026-05-15T08:30:00Z"
    }
  ]
}`},{method:"POST",path:"/api/microplans",auth:"District Manager+",description:"Creates a new microplan shell to coordinate geographic immunization campaigns or routine sessions.",requestExample:`{
  "name": "2026 SIA Polio Campaign - Kasama",
  "planType": "campaign",
  "targetPopulation": 18500,
  "districtId": 12
}`,responseExample:`{
  "success": true,
  "message": "Microplan created successfully",
  "data": {
    "id": 9,
    "name": "2026 SIA Polio Campaign - Kasama",
    "status": "draft",
    "planType": "campaign"
  }
}`},{method:"PATCH",path:"/api/monthly-reports/:id/approve",auth:"National Admin+",description:"Approves a submitted monthly microplanning execution report, committing indicators to permanent registry archives.",responseExample:`{
  "success": true,
  "message": "Report approved and archived successfully"
}`}]},{id:"sessions",title:"Session Scheduling",icon:M,description:"Session builder, daily operations, proximity validations, and completion logs.",endpoints:[{method:"GET",path:"/api/sessions",auth:"Authenticated",description:"List scheduled outreach and fixed sessions. Supports coordinates bounding box for GIS overlays.",params:[{name:"microplanId",type:"number",required:!1,description:"Scope to a specific microplan"},{name:"bbox",type:"string",required:!1,description:"Geo bbox: 'minLon,minLat,maxLon,maxLat'"}],responseExample:`{
  "success": true,
  "data": [
    {
      "id": 142,
      "name": "Milima Outreach Day 1",
      "status": "scheduled",
      "sessionDate": "2026-06-15",
      "facilityId": 105,
      "latitude": -10.182,
      "longitude": 31.221
    }
  ]
}`},{method:"POST",path:"/api/sessions/validate-proximity",auth:"Authenticated",description:"Validates if a newly planned outreach session location is too close (e.g. within 5km) to an existing schedule to eliminate vaccine provider overlap.",requestExample:`{
  "latitude": -10.185,
  "longitude": 31.225,
  "sessionDate": "2026-06-15"
}`,responseExample:`{
  "success": true,
  "hasConflict": true,
  "conflicts": [
    { "sessionId": 142, "name": "Milima Outreach Day 1", "distanceKm": 0.48 }
  ]
}`}]},{id:"clients",title:"Client Registry & Logbook",icon:P,description:"Child demographic logging, immunization schedules, and zero-dose tracking.",endpoints:[{method:"GET",path:"/api/clients",auth:"Authenticated",description:"Search and retrieve registered children. Support pagination, full-text fuzzy matching, and target risk filter.",params:[{name:"search",type:"string",required:!1,description:"Fuzzy search by name or registry card ID"},{name:"risk",type:"string",required:!1,description:"Filter by risk level: 'zero_dose', 'dropout', 'default'"}],responseExample:`{
  "success": true,
  "data": [
    {
      "id": 1084,
      "firstName": "Mutale",
      "lastName": "Mwamba",
      "birthDate": "2025-11-04",
      "caregiverName": "Joyce Mwamba",
      "riskStatus": "dropout",
      "vaccinationCount": 3
    }
  ]
}`},{method:"POST",path:"/api/clients/:id/vaccinate",auth:"Authenticated",description:"Records the administration of an antigen dose to a registered child, triggering system reminder status updates.",requestExample:`{
  "antigenCode": "DTP-HepB-Hib-1",
  "administeredDate": "2026-06-02",
  "facilityId": 105,
  "batchNumber": "B9032A"
}`,responseExample:`{
  "success": true,
  "message": "Vaccination recorded successfully",
  "data": {
    "vaccinationId": 4821,
    "nextScheduledDose": "2026-07-02",
    "nextAntigen": "DTP-HepB-Hib-2"
  }
}`}]},{id:"stock",title:"Vaccine Cold Chain & Stock",icon:z,description:"Antigen ledger management, wastage rates, stock transfers, and alerts.",endpoints:[{method:"GET",path:"/api/stock/ledger",auth:"Authenticated",description:"View localized balance sheets of active cold chain antigens at a facility or district store level.",params:[{name:"facilityId",type:"number",required:!0,description:"Scope to a specific facility warehouse"}],responseExample:`{
  "success": true,
  "data": [
    { "antigen": "BCG", "availableDoses": 420, "vialsCount": 21, "minThreshold": 100, "status": "adequate" },
    { "antigen": "OPV", "availableDoses": 80, "vialsCount": 4, "minThreshold": 150, "status": "understocked_alert" }
  ]
}`},{method:"POST",path:"/api/stock/transfer",auth:"District Manager+",description:"Log dispatch/receipt stock transfers between supply line nodes.",requestExample:`{
  "sourceFacilityId": 104,
  "destFacilityId": 105,
  "antigen": "OPV",
  "dosesCount": 100,
  "batchNumber": "V892"
}`,responseExample:`{
  "success": true,
  "message": "Transfer logged and inventory balances updated dynamically"
}`}]},{id:"sync",title:"Offline Sync & HIS Interop",icon:q,description:"Database sync endpoints for field tablets and push pipelines to national DHIS2.",endpoints:[{method:"GET",path:"/api/sync/pull",auth:"Authenticated",description:"Pull down delta changes made in the cloud since the client's last sync sequence timestamp. Essential for offline-first replication.",params:[{name:"since",type:"string",required:!0,description:"ISO timestamp of the client's last successful sync"}],responseExample:`{
  "success": true,
  "data": {
    "clients": [
      { "id": 1084, "firstName": "Mutale", "lastName": "Mwamba", "updatedAt": "2026-06-02T12:00:00Z" }
    ],
    "sessions": [],
    "stockTransactions": [],
    "serverTime": "2026-06-02T16:00:00Z"
  }
}`},{method:"POST",path:"/api/sync/batch",auth:"Authenticated",description:"Batch uploads offline operations stored in the SQLite outbox of a field tablet. Transactions execute atomically.",requestExample:`{
  "deviceToken": "vp_sec_7a2b...",
  "operations": [
    {
      "action": "create_client",
      "tempId": "tmp_90211",
      "payload": { "firstName": "Aaron", "lastName": "Phiri", "birthDate": "2026-01-10" }
    }
  ]
}`,responseExample:`{
  "success": true,
  "processed": 1,
  "failed": 0,
  "idMap": {
    "tmp_90211": 1085
  }
}`},{method:"POST",path:"/api/his/push-immunizations",auth:"National Admin+",description:"Triggers the pipeline to export aggregated monthly indicators (doses administered, drop-outs, wastage) to the National DHIS2 instance.",responseExample:`{
  "success": true,
  "dhis2Response": {
    "imported": 48,
    "updated": 2,
    "ignored": 0,
    "status": "SUCCESS"
  }
}`}]}];function K(){const{toast:k}=C(),[d,w]=p.useState(""),[r,x]=p.useState("all"),[c,g]=p.useState(null),l=t=>{navigator.clipboard.writeText(t),g(t),k({title:"Copied to clipboard",description:"Path/Payload has been successfully copied.",duration:2e3}),setTimeout(()=>g(null),2e3)},T=t=>{switch(t){case"GET":return"bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";case"POST":return"bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";case"PUT":return"bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";case"PATCH":return"bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";case"DELETE":return"bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";default:return"bg-slate-500/10 text-slate-700 border-slate-500/20"}},E=t=>{switch(t){case"Public":return"bg-sky-500/10 text-sky-700 dark:text-sky-400";case"Authenticated":return"bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";case"District Manager+":return"bg-amber-500/10 text-amber-700 dark:text-amber-400";case"National Admin+":return"bg-purple-500/10 text-purple-700 dark:text-purple-400";default:return"bg-rose-500/10 text-rose-700 dark:text-rose-400"}},f=j.map(t=>{if(r!=="all"&&t.id!==r)return null;const a=t.endpoints.filter(s=>s.path.toLowerCase().includes(d.toLowerCase())||s.description.toLowerCase().includes(d.toLowerCase()));return a.length===0?null:{...t,endpoints:a}}).filter(Boolean);return e.jsxs("div",{className:"min-h-screen bg-background",children:[e.jsx("div",{className:"border-b border-border/60 bg-card/50 backdrop-blur-sm sticky top-0 z-20 px-6 py-5",children:e.jsxs("div",{className:"flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-screen-2xl mx-auto",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20",children:e.jsx(D,{className:"h-5 w-5 text-white"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-xl font-bold text-foreground tracking-tight",children:"API Documentation"}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"REST Specifications & offline synchronization protocols for integrators."})]})]}),e.jsxs("div",{className:"flex items-center gap-2 text-xs text-muted-foreground",children:[e.jsx(G,{className:"h-4 w-4 text-primary"}),e.jsx("span",{children:"Role-Based Access Control Active"})]})]})}),e.jsx("div",{className:"max-w-screen-2xl mx-auto px-4 sm:px-6 py-8",children:e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-4 gap-8 items-start",children:[e.jsxs("div",{className:"lg:col-span-1 space-y-6 lg:sticky lg:top-24",children:[e.jsx(n,{className:"border-border/60 bg-card/70 backdrop-blur-sm",children:e.jsxs(o,{className:"p-4 space-y-4",children:[e.jsxs("div",{className:"relative",children:[e.jsx(y,{className:"absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"}),e.jsx(L,{placeholder:"Search endpoints...",className:"pl-9 h-9 text-xs",value:d,onChange:t=>w(t.target.value)})]}),e.jsx("div",{className:"border-t border-border/50 pt-2"}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("span",{className:"text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2",children:"Categories"}),e.jsxs("button",{onClick:()=>x("all"),className:`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${r==="all"?"bg-primary text-primary-foreground font-semibold shadow":"hover:bg-accent text-foreground/80"}`,children:[e.jsx(O,{className:"h-4 w-4 shrink-0"}),e.jsx("span",{children:"All Endpoints"})]}),j.map(t=>{const a=t.icon;return e.jsxs("button",{onClick:()=>x(t.id),className:`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${r===t.id?"bg-primary text-primary-foreground font-semibold shadow":"hover:bg-accent text-foreground/80"}`,children:[e.jsx(a,{className:"h-4 w-4 shrink-0"}),e.jsx("span",{className:"truncate",children:t.title})]},t.id)})]})]})}),e.jsx(n,{className:"border-border/60 bg-indigo-500/5 border-indigo-500/10",children:e.jsxs(o,{className:"p-4 space-y-2",children:[e.jsxs("div",{className:"flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400",children:[e.jsx(_,{className:"h-4 w-4"}),e.jsx("span",{children:"Security Notice"})]}),e.jsxs("p",{className:"text-[11px] leading-relaxed text-muted-foreground",children:["All requests must attach the `Cookie` session key or supply a generated device token in the `Authorization` header as:",e.jsx("code",{className:"block mt-1 p-1.5 rounded bg-muted/65 font-mono text-[10px] break-all",children:"Bearer vp_sec_..."})]})]})})]}),e.jsx("div",{className:"lg:col-span-3 space-y-12",children:f.length===0?e.jsx(n,{className:"border-border/60 bg-card/50 py-12",children:e.jsxs(o,{className:"text-center space-y-3",children:[e.jsx("div",{className:"h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto",children:e.jsx(y,{className:"h-5 w-5 text-muted-foreground"})}),e.jsx("h3",{className:"text-sm font-semibold",children:"No endpoints found"}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"Try adjusting your search keywords or choosing a different category."})]})}):f.map(t=>{const a=t.icon;return e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"flex items-start gap-3 pb-3 border-b border-border/50",children:[e.jsx("div",{className:"h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0",children:e.jsx(a,{className:"h-5 w-5 text-primary"})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-base font-bold text-foreground",children:t.title}),e.jsx("p",{className:"text-xs text-muted-foreground",children:t.description})]})]}),e.jsx("div",{className:"space-y-6",children:t.endpoints.map((s,b)=>e.jsxs(n,{className:"border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden hover:shadow-md transition-shadow",children:[e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/20 px-4 py-3 border-b border-border/40",children:[e.jsxs("div",{className:"flex flex-wrap items-center gap-2.5 min-w-0",children:[e.jsx(v,{className:`px-2 py-0.5 rounded text-[10px] font-bold border ${T(s.method)}`,variant:"outline",children:s.method}),e.jsx("code",{className:"text-xs md:text-sm font-mono font-bold text-foreground truncate break-all select-all",children:s.path}),e.jsx(m,{size:"icon",variant:"ghost",className:"h-6 w-6 text-muted-foreground hover:text-foreground shrink-0",onClick:()=>l(s.path),children:c===s.path?e.jsx(u,{className:"h-3 w-3 text-green-500"}):e.jsx(h,{className:"h-3 w-3"})})]}),e.jsx("div",{className:"flex items-center gap-2 self-start md:self-auto shrink-0",children:e.jsx(v,{className:`text-[10px] font-semibold ${E(s.auth)}`,variant:"secondary",children:s.auth})})]}),e.jsxs(o,{className:"p-4 space-y-4",children:[e.jsx("p",{className:"text-xs leading-relaxed text-foreground/90",children:s.description}),s.params&&s.params.length>0&&e.jsxs("div",{className:"space-y-2",children:[e.jsx("span",{className:"text-[10px] uppercase font-bold tracking-wider text-muted-foreground",children:"Parameters"}),e.jsx("div",{className:"border border-border/40 rounded-lg overflow-x-auto",children:e.jsxs("table",{className:"w-full text-left border-collapse text-xs",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-muted/30 border-b border-border/40 font-semibold",children:[e.jsx("th",{className:"px-3 py-2",children:"Parameter"}),e.jsx("th",{className:"px-3 py-2",children:"Type"}),e.jsx("th",{className:"px-3 py-2",children:"Required"}),e.jsx("th",{className:"px-3 py-2",children:"Description"})]})}),e.jsx("tbody",{className:"divide-y divide-border/40 font-mono text-[11px]",children:s.params.map((i,S)=>e.jsxs("tr",{className:"hover:bg-muted/10",children:[e.jsx("td",{className:"px-3 py-2 font-bold text-foreground",children:i.name}),e.jsx("td",{className:"px-3 py-2 text-primary",children:i.type}),e.jsx("td",{className:"px-3 py-2",children:i.required?e.jsx("span",{className:"text-rose-600 dark:text-rose-400 font-bold",children:"Yes"}):e.jsx("span",{className:"text-muted-foreground",children:"No"})}),e.jsx("td",{className:"px-3 py-2 font-sans font-normal text-muted-foreground",children:i.description})]},S))})]})})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-12 gap-4",children:[s.requestExample&&e.jsxs("div",{className:"md:col-span-6 space-y-1.5",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-[10px] uppercase font-bold tracking-wider text-muted-foreground",children:"Example Request"}),e.jsx(m,{size:"icon",variant:"ghost",className:"h-5 w-5 text-muted-foreground hover:text-foreground",onClick:()=>l(s.requestExample||""),children:c===s.requestExample?e.jsx(u,{className:"h-3 w-3 text-green-500"}):e.jsx(h,{className:"h-3 w-3"})})]}),e.jsx("pre",{className:"p-3 rounded-lg bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 text-zinc-200 dark:text-zinc-300 font-mono text-[10.5px] leading-relaxed overflow-x-auto",children:e.jsx("code",{children:s.requestExample})})]}),e.jsxs("div",{className:`${s.requestExample?"md:col-span-6":"md:col-span-12"} space-y-1.5`,children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-[10px] uppercase font-bold tracking-wider text-muted-foreground",children:"Example Response (200 OK)"}),e.jsx(m,{size:"icon",variant:"ghost",className:"h-5 w-5 text-muted-foreground hover:text-foreground",onClick:()=>l(s.responseExample),children:c===s.responseExample?e.jsx(u,{className:"h-3 w-3 text-green-500"}):e.jsx(h,{className:"h-3 w-3"})})]}),e.jsx("pre",{className:"p-3 rounded-lg bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 text-zinc-200 dark:text-zinc-300 font-mono text-[10.5px] leading-relaxed overflow-x-auto",children:e.jsx("code",{children:s.responseExample})})]})]})]})]},b))})]},t.id)})})]})})]})}export{K as default};
