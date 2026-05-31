import { Switch, Route, useParams, Redirect } from "wouter";
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
import { OnlinePresence } from "@/components/OnlinePresence";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

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
const SettlementIntelligence = lazy(() => import("@/pages/SettlementIntelligence"));
const StandardsAlignment = lazy(() => import("@/pages/StandardsAlignment"));
const DropoutRates = lazy(() => import("@/pages/DropoutRates"));
const ZeroDoseVillages = lazy(() => import("@/pages/ZeroDoseVillages"));
const ReconcileUnmappedVaccines = lazy(() => import("@/pages/ReconcileUnmappedVaccines"));
const AnnualNationalPlan = lazy(() => import("@/pages/AnnualNationalPlan"));
const DataSources = lazy(() => import("@/pages/DataSources"));

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

function AuthenticatedRouter() {
  const { data: tenant } = useQuery<any>({ queryKey: ["/api/me/tenant"], retry: false });

  useEffect(() => {
    if (tenant) {
      localStorage.setItem("vaxplan_active_tenant", JSON.stringify(tenant));
    }
  }, [tenant]);

  const modules = tenant?.settings?.modules || {
    budget: true,
    calculator: true,
    stock: true,
    mobilization: true,
    htr: true,
    interop: true,
  };

  return (
    <Suspense fallback={<RouteFallback />}>
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/flow">
        <MicroplanWizard />
      </Route>
      <Route path="/microplan/new">
        <MicroplanWizard />
      </Route>
      <Route path="/map" component={MapPage} />
      <Route path="/settlement-intelligence" component={SettlementIntelligence} />
      <Route path="/facilities" component={Facilities} />
      <Route path="/develop-microplan">
        <PreserveQueryRedirect to="/microplans/routine" />
      </Route>
      <Route path="/population" component={Population} />
      {/* Task #51: routine + campaign routes now mount the unified Microplan
          Builder wizard with planType pre-selected. The old SessionPlanning
          page stays available via /sessions for users who prefer the legacy
          standalone workspace. */}
      {/* Routine + SIA entries both render the Microplan Flow wizard. The
          prePlanType prop locks the type chooser in Step 1 and switches
          the header badge / default name accordingly. */}
      <Route path="/microplans/routine">
        <MicroplanWizard prePlanType="routine" />
      </Route>
      <Route path="/microplans/routine/:id">
        <MicroplanWizard prePlanType="routine" />
      </Route>
      <Route path="/microplans/campaigns">
        <MicroplanWizard prePlanType="campaign" />
      </Route>
      <Route path="/microplans/campaigns/:id">
        <MicroplanWizard prePlanType="campaign" />
      </Route>
      {/* Back-compat: /sessions now redirects to the routine microplan workspace. */}
      <Route path="/sessions">
        <SessionPlanning planTypeFilter="routine" />
      </Route>
      {/* Task #50 — Routed detail mode for SessionPlanning so the unserved-place
          one-click "Plan a session here" flow lands on the New Session dialog
          with the village prefilled. */}
      <Route path="/sessions/microplan/:id">
        <SessionPlanningDetailRoute planTypeFilter="routine" />
      </Route>
      <Route path="/sessions/campaign/:id">
        <SessionPlanningDetailRoute planTypeFilter="campaign" />
      </Route>
      <Route path="/all-sessions" component={SessionsHub} />
      <Route path="/sessions/history" component={SessionHistory} />
      <Route path="/admin/reconcile-vaccines" component={ReconcileUnmappedVaccines} />
      <Route path="/sessions/:id/day-plans" component={SessionDayPlans} />
      <Route path="/clients/defaulters" component={Defaulters} />
      <Route path="/indicators/dropout" component={DropoutRates} />
      <Route path="/indicators/zero-dose" component={ZeroDoseVillages} />
      <Route path="/clients" component={ClientLogbook} />
      <Route path="/stock">
        {modules.stock !== false ? <StockLedger /> : <NotFound />}
      </Route>
      <Route path="/htr">
        {modules.htr !== false ? <HardToReach /> : <NotFound />}
      </Route>
      {/* Budget / Vaccine Calculator / Social Mobilization are now steps inside
          the Microplan wizard (Steps 9, 6, 7). The standalone routes redirect
          to the wizard so bookmarks keep working. */}
      <Route path="/budget">
        <PreserveQueryRedirect to="/microplans/routine" />
      </Route>
      <Route path="/vaccines">
        <PreserveQueryRedirect to="/microplans/routine" />
      </Route>
      <Route path="/mobilization">
        <PreserveQueryRedirect to="/microplans/routine" />
      </Route>
      <Route path="/approvals" component={Approvals} />
      <Route path="/supervision" component={Supervision} />
      <Route path="/supervision/templates" component={SupervisionTemplates} />
      <Route path="/admin/signups" component={SignupRequests} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/countries" component={CountryOnboarding} />
      <Route path="/admin/boundaries" component={BoundaryManager} />
      <Route path="/admin/custom-layers" component={CustomLayers} />
      <Route path="/his-integrations">
        {modules.interop !== false ? <HisIntegrations /> : <NotFound />}
      </Route>
      <Route path="/missed-communities" component={MissedCommunities} />
      <Route path="/standards-alignment" component={StandardsAlignment} />
      <Route path="/national-plan" component={AnnualNationalPlan} />
      <Route path="/data-sources" component={DataSources} />
      <Route path="/settings" component={Settings} />
      <Route path="/sync/conflicts" component={lazy(() => import("@/pages/SyncConflicts"))} />
      <Route path="/help" component={Help} />
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
      <div className="flex h-screen w-full">
        <AppSidebar user={user} />
        <div className="flex flex-col flex-1 min-w-0">
          {/* Original Code: Sticky header container with z-50, which got covered by Leaflet layers (z-1000)
          <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b supports-[backdrop-filter]:bg-background/60">
            <TenantSwitcher />
          */}
          {/* Updated Code: Elevate z-index to z-[2000] to overlay cleanly above all maps and panels */}
          <div className="sticky top-0 z-[2000] bg-background/95 backdrop-blur border-b supports-[backdrop-filter]:bg-background/60">
            <TenantSwitcher />
            <header className="flex items-center justify-between gap-2 p-2">
              <div className="flex items-center gap-2">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
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
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Suspense fallback={<RouteFallback />}>
            <Switch>
              <Route path="/signup" component={Signup} />
              <Route path="/data-sources" component={DataSourcesGate} />
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
