import { Switch, Route, useParams, Redirect } from "wouter";
import { navigate } from "wouter/use-browser-location";
import { useEffect, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SyncStatus } from "@/components/SyncStatus";
import { ConflictBadge } from "@/components/ConflictBadge";
import { useDeviceTokenBootstrap } from "@/hooks/useDeviceTokenBootstrap";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";
import { UserMenu } from "@/components/UserMenu";
import { GlobalSearch } from "@/components/GlobalSearch";
import { OnlinePresence } from "@/components/OnlinePresence";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { IdleTimeoutController } from "@/components/IdleTimeoutController";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { InstallPrompt } from "@/components/InstallPrompt";
import { UpdateBanner } from "@/components/UpdateBanner";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useUnmappedAntigenWarnings } from "@/hooks/useUnmappedAntigenWarnings";
import { useProximityConflictWarnings } from "@/hooks/useProximityConflictWarnings";
import { HeartPulse } from "lucide-react";

const MapPage = lazy(() => import("@/pages/MapPage"));
const Facilities = lazy(() => import("@/pages/Facilities"));
const Population = lazy(() => import("@/pages/Population"));
const SessionPlanning = lazy(() => import("@/pages/SessionPlanning"));
const SessionsHub = lazy(() => import("@/pages/SessionsHub"));
const HardToReach = lazy(() => import("@/pages/HardToReach"));
// BudgetPlanning / VaccineCalculator / SocialMobilization are no longer
// mounted as standalone pages — those concerns are now Steps 9 / 6 / 7 of the
// Microplan Wizard. The /budget, /vaccines, /mobilization routes redirect to
// the wizard (see <PreserveQueryRedirect> below).
const Approvals = lazy(() => import("@/pages/Approvals"));
const Supervision = lazy(() => import("@/pages/Supervision"));
const SupervisionTemplates = lazy(() => import("@/pages/SupervisionTemplates"));
const Settings = lazy(() => import("@/pages/Settings"));
const Help = lazy(() => import("@/pages/Help"));
const Signup = lazy(() => import("@/pages/Signup"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const StaffManagement = lazy(() => import("@/pages/StaffManagement"));
const SignupRequests = lazy(() => import("@/pages/SignupRequests"));
const CountryOnboarding = lazy(() => import("@/pages/CountryOnboarding"));
const BoundaryManager = lazy(() => import("@/pages/BoundaryManager"));
const CustomLayers = lazy(() => import("@/pages/CustomLayers"));
const ClientLogbook = lazy(() => import("@/pages/ClientLogbook"));
const Defaulters = lazy(() => import("@/pages/Defaulters"));
const StockLedger = lazy(() => import("@/pages/StockLedger"));
const SessionDayPlans = lazy(() => import("@/pages/SessionDayPlans"));
const SessionHistory = lazy(() => import("@/pages/SessionHistory"));
const HisIntegrations = lazy(() => import("@/pages/HisIntegrations"));
const MissedCommunities = lazy(() => import("@/pages/MissedCommunities"));
const MicroplanWizard = lazy(() => import("@/pages/MicroplanWizard"));
const MicroplanList = lazy(() => import("@/pages/MicroplanList"));
const SettlementIntelligence = lazy(() => import("@/pages/SettlementIntelligence"));
const StandardsAlignment = lazy(() => import("@/pages/StandardsAlignment"));
const DropoutRates = lazy(() => import("@/pages/DropoutRates"));
const ZeroDoseVillages = lazy(() => import("@/pages/ZeroDoseVillages"));
const ReconcileUnmappedVaccines = lazy(() => import("@/pages/ReconcileUnmappedVaccines"));
const AnnualNationalPlan = lazy(() => import("@/pages/AnnualNationalPlan"));
const MicroplanPrintView = lazy(() => import("@/pages/MicroplanPrintView"));
const DataSources = lazy(() => import("@/pages/DataSources"));
const FieldTeams = lazy(() => import("@/pages/FieldTeams"));
const Reports    = lazy(() => import("@/pages/Reports"));
const ApiReference = lazy(() => import("@/pages/ApiReference"));
const IndicatorManual = lazy(() => import("@/pages/IndicatorManual"));
const SupervisionTools = lazy(() => import("@/pages/SupervisionTools"));
const PCE = lazy(() => import("@/pages/PCE"));
const HouseToHouse = lazy(() => import("@/pages/HouseToHouse"));
const ModuleDisabled = lazy(() => import("@/pages/ModuleDisabled"));
const Surveillance = lazy(() => import("@/pages/Surveillance"));
const WikiEditor = lazy(() => import("@/pages/WikiEditor"));
import { DEFAULT_MODULES } from "@/lib/modules";

// Task #50 — Small wrapper that reads :id from the route and passes it to
// SessionPlanning as `lockedMicroplanId`, so the unserved-prefill auto-open
// flow has a real routed home.
// Small wrapper around wouter <Redirect> that carries the current URL's query
// string along to the destination. This matters because some legacy in-app
// links pass `?facility=…&microplan=…` and the destination route (the wizard)
// reads those params to keep context.
function PreserveQueryRedirect({ to }: { to: string }) {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return <Redirect to={`${to}${search}`} />;
}

function SessionPlanningDetailRoute({ planTypeFilter }: { planTypeFilter: "routine" | "campaign" }) {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : NaN;
  if (!Number.isFinite(id)) return <NotFound />;
  return <SessionPlanning planTypeFilter={planTypeFilter} lockedMicroplanId={id} />;
}

function RouteFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="space-y-4 text-center">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

// Public, unauthenticated chrome for pages that are meant to be viewable
// without signing in (e.g. the Data Sources & Acknowledgements page). Provides
// a slim header that links back to the landing page and a small footer.
function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3" data-testid="link-public-home">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">VaxPlan</span>
              <span className="text-xs text-muted-foreground">
                Health microplanning for Ministries
              </span>
            </div>
          </a>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="/"
              className="text-sm text-primary hover:underline"
              data-testid="link-public-back-home"
            >
              ← Back to home
            </a>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

// Gate for the public Data Sources route. Authenticated users get the full
// in-app shell (so the sidebar link keeps working), while signed-out visitors
// get a public, read-only version inside the slim public chrome.
function DataSourcesGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (user) {
    return <AuthenticatedLayout />;
  }

  return (
    <PublicPageShell>
      <Suspense fallback={<RouteFallback />}>
        <DataSources />
      </Suspense>
    </PublicPageShell>
  );
}

// Gate for the public Help route. Authenticated users get the full in-app
// shell (sidebar, etc.) so the Help link in the sidebar still works, while
// non-signed-in visitors see the same page inside the slim public chrome —
// no login required.
function HelpGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (user) {
    return <AuthenticatedLayout />;
  }

  return (
    <PublicPageShell>
      <Suspense fallback={<RouteFallback />}>
        <Help />
      </Suspense>
    </PublicPageShell>
  );
}

function AuthenticatedRouter() {
  const { data: tenant } = useQuery<any>({ queryKey: ["/api/me/tenant"], retry: false });

  useEffect(() => {
    if (tenant) {
      localStorage.setItem("vaxplan_active_tenant", JSON.stringify(tenant));
    }
  }, [tenant]);

  const modules = {
    ...DEFAULT_MODULES,
    ...(tenant?.settings?.modules || {})
  };

  return (
    <Suspense fallback={<RouteFallback />}>
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/flow">
        {(modules.routine !== false || modules.campaigns !== false) ? <MicroplanWizard /> : <ModuleDisabled moduleName="Microplan Wizard" />}
      </Route>
      <Route path="/microplan/new">
        {(modules.routine !== false || modules.campaigns !== false) ? <MicroplanWizard /> : <ModuleDisabled moduleName="Microplan Wizard" />}
      </Route>
      <Route path="/map">
        {modules.map !== false ? <MapPage /> : <ModuleDisabled moduleName="Map View" />}
      </Route>
      <Route path="/settlement-intelligence">
        {modules.settlementIntel !== false ? <SettlementIntelligence /> : <ModuleDisabled moduleName="Settlement Intelligence" />}
      </Route>
      <Route path="/facilities">
        {modules.facilities !== false ? <Facilities /> : <ModuleDisabled moduleName="Facilities" />}
      </Route>
      <Route path="/develop-microplan">
        {modules.routine !== false ? <PreserveQueryRedirect to="/microplans/routine" /> : <ModuleDisabled moduleName="Routine Microplan" />}
      </Route>
      <Route path="/population">
        {modules.population !== false ? <Population /> : <ModuleDisabled moduleName="Population Hub" />}
      </Route>
      {/* Task #51: routine + campaign routes now mount the unified Microplan
          Builder wizard with planType pre-selected. The old SessionPlanning
          page stays available via /sessions for users who prefer the legacy
          standalone workspace. */}
      {/* Routine + SIA entries both render the Microplan Flow wizard. The
          prePlanType prop locks the type chooser in Step 1 and switches
          the header badge / default name accordingly. */}
      <Route path="/microplans/routine">
        {modules.routine !== false ? <MicroplanList planType="routine" /> : <ModuleDisabled moduleName="Routine Microplan" />}
      </Route>
      <Route path="/microplans/routine/:id">
        {modules.routine !== false ? <MicroplanWizard prePlanType="routine" /> : <ModuleDisabled moduleName="Routine Microplan" />}
      </Route>
      <Route path="/microplans/campaigns">
        {modules.campaigns !== false ? <MicroplanList planType="campaign" /> : <ModuleDisabled moduleName="SIA Campaigns" />}
      </Route>
      <Route path="/microplans/campaigns/:id">
        {modules.campaigns !== false ? <MicroplanWizard prePlanType="campaign" /> : <ModuleDisabled moduleName="SIA Campaigns" />}
      </Route>
      <Route path="/microplans/:id/print">
        {modules.routine !== false || modules.campaigns !== false ? <MicroplanPrintView /> : <ModuleDisabled moduleName="Microplan Print View" />}
      </Route>
      {/* Back-compat: /sessions now redirects to the routine microplan workspace. */}
      <Route path="/sessions">
        {modules.sessions !== false ? <SessionPlanning planTypeFilter="routine" /> : <ModuleDisabled moduleName="Sessions Hub" />}
      </Route>
      {/* Task #50 — Routed detail mode for SessionPlanning so the unserved-place
          one-click "Plan a session here" flow lands on the New Session dialog
          with the village prefilled. */}
      <Route path="/sessions/microplan/:id">
        {modules.sessions !== false ? <SessionPlanningDetailRoute planTypeFilter="routine" /> : <ModuleDisabled moduleName="Sessions Hub" />}
      </Route>
      <Route path="/sessions/campaign/:id">
        {modules.sessions !== false ? <SessionPlanningDetailRoute planTypeFilter="campaign" /> : <ModuleDisabled moduleName="Sessions Hub" />}
      </Route>
      <Route path="/all-sessions">
        {modules.sessions !== false ? <SessionsHub /> : <ModuleDisabled moduleName="Sessions Hub" />}
      </Route>
      <Route path="/sessions/history">
        {modules.sessions !== false ? <SessionHistory /> : <ModuleDisabled moduleName="Sessions Hub" />}
      </Route>
      <Route path="/admin/reconcile-vaccines" component={ReconcileUnmappedVaccines} />
      <Route path="/sessions/:id/day-plans">
        {modules.sessions !== false ? <SessionDayPlans /> : <ModuleDisabled moduleName="Sessions Hub" />}
      </Route>
      <Route path="/clients/defaulters">
        {modules.defaulters !== false ? <Defaulters /> : <ModuleDisabled moduleName="Defaulter Tracking" />}
      </Route>
      <Route path="/indicators/dropout">
        {modules.dropout !== false ? <DropoutRates /> : <ModuleDisabled moduleName="Dropout Rates" />}
      </Route>
      <Route path="/indicators/zero-dose">
        {modules.zeroDose !== false ? <ZeroDoseVillages /> : <ModuleDisabled moduleName="Zero-Dose Villages" />}
      </Route>
      <Route path="/clients">
        {modules.clientLogbook !== false ? <ClientLogbook /> : <ModuleDisabled moduleName="Client Logbook" />}
      </Route>
      <Route path="/stock">
        {modules.stock !== false ? <StockLedger /> : <ModuleDisabled moduleName="Stock Ledger" />}
      </Route>
      <Route path="/htr">
        {modules.htr !== false ? <HardToReach /> : <ModuleDisabled moduleName="Hard-to-Reach Scores" />}
      </Route>
      {/* Budget / Vaccine Calculator / Social Mobilization are now steps inside
          the Microplan wizard (Steps 9, 6, 7). The standalone routes redirect
          to the wizard so bookmarks keep working. */}
      <Route path="/budget">
        {modules.budget !== false ? <PreserveQueryRedirect to="/microplans/routine" /> : <ModuleDisabled moduleName="Budget Planning" />}
      </Route>
      <Route path="/vaccines">
        {modules.calculator !== false ? <PreserveQueryRedirect to="/microplans/routine" /> : <ModuleDisabled moduleName="Vaccine Calculator" />}
      </Route>
      <Route path="/mobilization">
        {modules.mobilization !== false ? <PreserveQueryRedirect to="/microplans/routine" /> : <ModuleDisabled moduleName="Social Mobilization" />}
      </Route>
      <Route path="/approvals" component={Approvals} />
      <Route path="/supervision">
        {modules.supervision !== false ? <Supervision /> : <ModuleDisabled moduleName="Supervision & Checklists" />}
      </Route>
      <Route path="/supervision/templates">
        {modules.supervision !== false ? <SupervisionTemplates /> : <ModuleDisabled moduleName="Supervision & Checklists" />}
      </Route>
      <Route path="/supervision-tools">
        {modules.supervision !== false ? <SupervisionTools /> : <ModuleDisabled moduleName="Supervision & Checklists" />}
      </Route>
      <Route path="/pce">
        {modules.supervision !== false ? <PCE /> : <ModuleDisabled moduleName="Supervision & Checklists" />}
      </Route>
      <Route path="/house-to-house">
        {modules.supervision !== false ? <HouseToHouse /> : <ModuleDisabled moduleName="Supervision & Checklists" />}
      </Route>
      <Route path="/admin/signups" component={SignupRequests} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/staff" component={StaffManagement} />
      <Route path="/admin/countries" component={CountryOnboarding} />
      <Route path="/admin/boundaries" component={BoundaryManager} />
      <Route path="/admin/custom-layers" component={CustomLayers} />
      <Route path="/admin/wiki" component={WikiEditor} />
      <Route path="/his-integrations">
        {modules.interop !== false ? <HisIntegrations /> : <ModuleDisabled moduleName="HIS Interoperability" />}
      </Route>
      <Route path="/missed-communities">
        {modules.missedCommunities !== false ? <MissedCommunities /> : <ModuleDisabled moduleName="Missed Communities" />}
      </Route>
      <Route path="/standards-alignment" component={StandardsAlignment} />
      <Route path="/national-plan" component={AnnualNationalPlan} />
      <Route path="/data-sources" component={DataSources} />
      <Route path="/field-teams">
        {modules.fieldTeams !== false ? <FieldTeams /> : <ModuleDisabled moduleName="Field Teams" />}
      </Route>
      <Route path="/reports" component={Reports} />
      <Route path="/indicators/manual" component={IndicatorManual} />
      <Route path="/api-reference" component={ApiReference} />
      <Route path="/surveillance" component={Surveillance} />
      <Route path="/settings" component={Settings} />
      <Route path="/help" component={Help} />
      <Route path="/sync/conflicts" component={lazy(() => import("@/pages/SyncConflicts"))} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function AuthenticatedLayout() {
  const { user, isLoading } = useAuth();
  // Task #106 — surface a toast when the offline outbox replays a mark-done
  // and the server reports antigen codes outside the tenant's vaccine schedule.
  useUnmappedAntigenWarnings();
  useProximityConflictWarnings();
  useDeviceTokenBootstrap(user);
  useRealtimeSync();
  useAnalyticsTracker(!!user);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <IdleTimeoutController />
      <div className="flex h-screen w-full">
        <AppSidebar user={user} />
        <div className="flex flex-col flex-1 min-w-0">
          {/* Updated Code: Elevate z-index to z-[2000] to overlay cleanly above all maps and panels */}
          <div className="sticky top-0 z-[2000] bg-background/95 backdrop-blur border-b supports-[backdrop-filter]:bg-background/60">
            <TenantSwitcher />
            <header className="flex items-center justify-between gap-2 p-2">
              <div className="flex items-center gap-2">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <GlobalSearch user={user} />
              </div>
              <div className="flex items-center gap-2">
                <ConflictBadge />
                <SyncStatus />
                <OnlinePresence />
                <ThemeToggle />
                <UserMenu user={user} />
              </div>
            </header>
          </div>
          <main className="flex-1 overflow-auto">
            <UpdateBanner />
            <OfflineBanner />
            <AuthenticatedRouter />
          </main>
          <InstallPrompt />
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  // Task #276 — the basemap attribution credit on every Leaflet map ends with a
  // "Data sources" link (see OSM_TILE_ATTRIBUTION / ESRI_IMAGERY_ATTRIBUTION).
  // Leaflet renders attribution as raw HTML outside React, so a delegated click
  // handler intercepts that link and routes within the SPA instead of doing a
  // full page reload (better for the offline build). The anchor's plain href
  // remains a working fallback if this listener ever fails to attach.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      // Respect new-tab / modifier-key clicks and non-primary buttons.
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const link = target?.closest<HTMLAnchorElement>(
        "a[data-data-sources-link]",
      );
      if (!link) return;
      event.preventDefault();
      navigate("/data-sources");
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Suspense fallback={<RouteFallback />}>
            <Switch>
              <Route path="/signup" component={Signup} />
              <Route path="/data-sources" component={DataSourcesGate} />
              <Route path="/help" component={HelpGate} />
              <Route><AuthenticatedLayout /></Route>
            </Switch>
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
