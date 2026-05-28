import { Switch, Route } from "wouter";
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
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { InstallPrompt } from "@/components/InstallPrompt";
import { OfflineBanner } from "@/components/OfflineBanner";

const MapPage = lazy(() => import("@/pages/MapPage"));
const Facilities = lazy(() => import("@/pages/Facilities"));
const Population = lazy(() => import("@/pages/Population"));
const SessionPlanning = lazy(() => import("@/pages/SessionPlanning"));
const HardToReach = lazy(() => import("@/pages/HardToReach"));
const BudgetPlanning = lazy(() => import("@/pages/BudgetPlanning"));
const VaccineCalculator = lazy(() => import("@/pages/VaccineCalculator"));
const SocialMobilization = lazy(() => import("@/pages/SocialMobilization"));
const Approvals = lazy(() => import("@/pages/Approvals"));
const Supervision = lazy(() => import("@/pages/Supervision"));
const Settings = lazy(() => import("@/pages/Settings"));
const Help = lazy(() => import("@/pages/Help"));
const Signup = lazy(() => import("@/pages/Signup"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const SignupRequests = lazy(() => import("@/pages/SignupRequests"));
const CountryOnboarding = lazy(() => import("@/pages/CountryOnboarding"));
const BoundaryManager = lazy(() => import("@/pages/BoundaryManager"));
const ClientLogbook = lazy(() => import("@/pages/ClientLogbook"));
const Defaulters = lazy(() => import("@/pages/Defaulters"));
const StockLedger = lazy(() => import("@/pages/StockLedger"));
const SessionDayPlans = lazy(() => import("@/pages/SessionDayPlans"));
const SessionHistory = lazy(() => import("@/pages/SessionHistory"));
const HisIntegrations = lazy(() => import("@/pages/HisIntegrations"));
const MissedCommunities = lazy(() => import("@/pages/MissedCommunities"));
const MicroplanBuilder = lazy(() => import("@/pages/MicroplanBuilder"));
const MicroplanWizard = lazy(() => import("@/pages/MicroplanWizard"));
const SettlementIntelligence = lazy(() => import("@/pages/SettlementIntelligence"));
const StandardsAlignment = lazy(() => import("@/pages/StandardsAlignment"));

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
      <Route path="/flow" component={MicroplanWizard} />
      <Route path="/microplan/new" component={MicroplanWizard} />
      <Route path="/map" component={MapPage} />
      <Route path="/settlement-intelligence" component={SettlementIntelligence} />
      <Route path="/facilities" component={Facilities} />
      <Route path="/develop-microplan">
        <MicroplanBuilder />
      </Route>
      <Route path="/population" component={Population} />
      {/* Task #51: routine + campaign routes now mount the unified Microplan
          Builder wizard with planType pre-selected. The old SessionPlanning
          page stays available via /sessions for users who prefer the legacy
          standalone workspace. */}
      <Route path="/microplans/routine">
        <MicroplanBuilder prePlanType="routine" />
      </Route>
      <Route path="/microplans/routine/:id">
        <MicroplanBuilder prePlanType="routine" />
      </Route>
      <Route path="/microplans/campaigns">
        <MicroplanBuilder prePlanType="campaign" />
      </Route>
      <Route path="/microplans/campaigns/:id">
        <MicroplanBuilder prePlanType="campaign" />
      </Route>
      {/* Back-compat: /sessions now redirects to the routine microplan workspace. */}
      <Route path="/sessions">
        <SessionPlanning planTypeFilter="routine" />
      </Route>
      <Route path="/sessions/history" component={SessionHistory} />
      <Route path="/sessions/:id/day-plans" component={SessionDayPlans} />
      <Route path="/clients/defaulters" component={Defaulters} />
      <Route path="/clients" component={ClientLogbook} />
      <Route path="/stock">
        {modules.stock !== false ? <StockLedger /> : <NotFound />}
      </Route>
      <Route path="/htr">
        {modules.htr !== false ? <HardToReach /> : <NotFound />}
      </Route>
      <Route path="/budget">
        {modules.budget !== false ? <BudgetPlanning /> : <NotFound />}
      </Route>
      <Route path="/vaccines">
        {modules.calculator !== false ? <VaccineCalculator /> : <NotFound />}
      </Route>
      <Route path="/mobilization">
        {modules.mobilization !== false ? <SocialMobilization /> : <NotFound />}
      </Route>
      <Route path="/approvals" component={Approvals} />
      <Route path="/supervision" component={Supervision} />
      <Route path="/admin/signups" component={SignupRequests} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/countries" component={CountryOnboarding} />
      <Route path="/admin/boundaries" component={BoundaryManager} />
      <Route path="/his-integrations">
        {modules.interop !== false ? <HisIntegrations /> : <NotFound />}
      </Route>
      <Route path="/missed-communities" component={MissedCommunities} />
      <Route path="/standards-alignment" component={StandardsAlignment} />
      <Route path="/settings" component={Settings} />
      <Route path="/help" component={Help} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function AuthenticatedLayout() {
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
                <SyncStatus />
                <ThemeToggle />
                <UserMenu user={user} />
              </div>
            </header>
          </div>
          <main className="flex-1 overflow-auto">
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
