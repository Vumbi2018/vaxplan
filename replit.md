# GIS Microplanning Application

## Overview
This GIS-based health microplanning application is designed to support vaccination programs, initially for Papua New Guinea and now expanding to other countries like Zambia. Its primary purpose is to empower health workers with tools for planning vaccination sessions, managing health facility and village data, tracking populations, calculating vaccine requirements, and coordinating outreach activities. The system is built with a mobile-first, offline-capable architecture to function effectively in remote areas with limited connectivity. The project envisions becoming a multitenant SaaS platform, branded as "VaxPlan," to be adopted by multiple Ministries of Health globally, enhancing vaccination efforts and public health outcomes across various nations.

## User Preferences
Preferred communication style: Simple, everyday language.
Keep the Help page current: whenever a user-facing feature changes, update the End-User Guide (`docs/USER_GUIDE.md`), the Facility Quick-Start (`docs/QUICKSTART_FACILITY.md`), and the in-app FAQs (`defaultFaqs` in `client/src/pages/Help.tsx`) as part of the same change.

## System Architecture

### Frontend Architecture
The frontend is built using React 18 with TypeScript, utilizing Wouter for routing and TanStack React Query for state management. UI components are sourced from shadcn/ui, based on Radix UI primitives, and styled with Tailwind CSS following Material Design 3 guidelines. Interactive mapping is handled by Leaflet with React-Leaflet and geospatial calculations by Turf.js. Form management uses React Hook Form with Zod validation, and Vite serves as the build tool.

### Backend Architecture
The backend is a Node.js Express application written in TypeScript, using ESM modules. It exposes RESTful API endpoints. Authentication is managed via Replit OpenID Connect with Passport.js, utilizing session-based storage in PostgreSQL.

### Data Storage
PostgreSQL is the chosen database, accessed via Drizzle ORM. The schema, defined in `shared/schema.ts`, includes key entities such as Users, Facilities, Villages, Population Data, Session Plans, and Audit Logs. Drizzle Kit manages database migrations.

### Multitenant Architecture
The system supports a multitenant SaaS model, allowing different Ministries of Health to use the platform independently. This involves:
- A `tenants` table for each country's Ministry of Health.
- Per-tenant SSO configurations for various Identity Providers (OIDC/SAML).
- A self-service signup process with hierarchical approval workflows.
- Tenant-scoped data isolation across all domain tables.
- A real cross-tenant browsing model: any authenticated user lands on their **home tenant** (resolved from `users.tenantId`, then SSO domain mapping, then approved signup invite) and sees a slim country switcher in the app header. Selecting another active tenant calls `POST /api/me/switch-tenant`, which sets `session.viewTenantId`; subsequent requests scope reads to that tenant. Writes outside the user's home tenant are rejected with HTTP 403 by `crossTenantWriteGuard`, keeping foreign data clean. The DEMO sandbox tenant and `demo-*` user rows remain in the database but are filtered out of the switcher dropdown — there are no `/demo` routes, demo CTAs, or demo banners in the UI.
- A product rebrand to "VaxPlan" to support its multitenant nature, removing country-specific labels.
- **Mark-done antigen validation**: `POST /api/sessions/:id/mark-done` validates `perAntigen` keys against the tenant's expanded vaccine schedule (via `expandVaccineSchedule` in `shared/vaccineSchedule.ts`). Known codes are canonicalized to the schedule's exact code (case- and whitespace-insensitive lookup, e.g. `opv-1` → `OPV-1`) and stored under `vaccinatedCounts.perAntigen`; unknown codes (stale clients or older offline outbox entries) are kept under `vaccinatedCounts.perAntigenUnmapped` so they still count toward totals but don't pollute per-antigen rollups. Each occurrence writes a `mark_done_unmapped_antigens` audit log entry and the response includes an `unmappedAntigenCodes` array so offline-sync clients can surface a warning instead of silently dropping the data.
- **Microplan authoring is reserved for facility staff** (`facility_clerk` and `facility_in_charge`), with `national_admin` also permitted (for setup/seed/corrections). District and provincial roles are reviewers/approvers only — enforced both in the UI (`canCreateSessionPlan` / `canApproveSessionPlan` in `client/src/lib/permissions.ts`, role-aware `pages/SessionPlanning.tsx` with cascading Province → District → Facility picker) and on the server (`authorRoles` allowlist on `POST /api/sessions` returns 403 for district/provincial roles).

### Role-Based Access Control
The application implements multi-level user roles (e.g., Facility Clerk, District Manager, National Admin) with hierarchical approval workflows to manage access and operations.

### Key Design Patterns
- **Shared Schema**: Drizzle schema and Zod validators are shared between client and server for consistency.
- **Storage Interface**: An abstract storage layer simplifies database interactions.
- **Query Client**: Centralized API request handling includes automatic authentication error detection.
- **Theme System**: Supports light and dark modes using CSS custom properties.

## External Dependencies

### Database
- **PostgreSQL**: The primary database.
- **Drizzle ORM**: For type-safe database interactions.

### Authentication
- **Replit OpenID Connect**: For user authentication.

### Mapping Services
- **OpenStreetMap**: Default map tiles.
- **Leaflet**: Mapping library.

### UI Libraries
- **Google Fonts**: For typography (Roboto, DM Sans, Geist Mono, Fira Code).
- **Recharts**: For data visualization.
- **Lucide React**: For icons.