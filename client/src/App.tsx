import { Switch, Route } from "wouter";
import { useEffect } from "react";
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
import MapPage from "@/pages/MapPage";
import Facilities from "@/pages/Facilities";
import Population from "@/pages/Population";
import SessionPlanning from "@/pages/SessionPlanning";
import HardToReach from "@/pages/HardToReach";
import BudgetPlanning from "@/pages/BudgetPlanning";
import VaccineCalculator from "@/pages/VaccineCalculator";
import SocialMobilization from "@/pages/SocialMobilization";
import Approvals from "@/pages/Approvals";
import Settings from "@/pages/Settings";
import Help from "@/pages/Help";
import Signup from "@/pages/Signup";
import UserManagement from "@/pages/UserManagement";
import SignupRequests from "@/pages/SignupRequests";
import CountryOnboarding from "@/pages/CountryOnboarding";
import BoundaryManager from "@/pages/BoundaryManager";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { InstallPrompt } from "@/components/InstallPrompt";
import NotFound from "@/pages/not-found";
import ClientLogbook from "@/pages/ClientLogbook";
import StockLedger from "@/pages/StockLedger";
import SessionDayPlans from "@/pages/SessionDayPlans";
import HisIntegrations from "@/pages/HisIntegrations";
import MicroplanBuilder from "@/pages/MicroplanBuilder";
import SettlementIntelligence from "@/pages/SettlementIntelligence";
import StandardsAlignment from "@/pages/StandardsAlignment";
import { OfflineBanner } from "@/components/OfflineBanner";

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
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/map" component={MapPage} />
      <Route path="/settlement-intelligence" component={SettlementIntelligence} />
      <Route path="/facilities" component={Facilities} />
      <Route path="/develop-microplan" component={MicroplanBuilder} />
      <Route path="/population" component={Population} />
      <Route path="/microplans/routine">
        <SessionPlanning planTypeFilter="routine" />
      </Route>
      <Route path="/microplans/campaigns">
        <SessionPlanning planTypeFilter="campaign" />
      </Route>
      {/* Back-compat: /sessions now redirects to the routine microplan workspace. */}
      <Route path="/sessions">
        <SessionPlanning planTypeFilter="routine" />
      </Route>
      <Route path="/sessions/:id/day-plans" component={SessionDayPlans} />
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
      <Route path="/admin/signups" component={SignupRequests} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/countries" component={CountryOnboarding} />
      <Route path="/admin/boundaries" component={BoundaryManager} />
      <Route path="/his-integrations">
        {modules.interop !== false ? <HisIntegrations /> : <NotFound />}
      </Route>
      <Route path="/standards-alignment" component={StandardsAlignment} />
      <Route path="/settings" component={Settings} />
      <Route path="/help" component={Help} />
      <Route component={NotFound} />
    </Switch>
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
          <Switch>
            <Route path="/signup" component={Signup} />
            <Route><AuthenticatedLayout /></Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
