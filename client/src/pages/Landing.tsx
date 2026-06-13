import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Map,
  Users,
  Calendar,
  Shield,
  Cloud,
  BarChart3,
  Globe,
  Stethoscope,
  Syringe,
  HeartPulse,
  Activity,
  Pill,
  Building2,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageHead } from "@/components/PageHead";
import { versionLabel } from "@/lib/version";

interface PublicTenant {
  id: string;
  code: string;
  name: string;
  countryCode: string;
}


const features = [
  {
    icon: Map,
    title: "Interactive GIS Mapping",
    description:
      "Visualize health facilities, villages, and catchment areas with offline-capable maps and satellite imagery — wherever your clinics are.",
  },
  {
    icon: Syringe,
    title: "Immunization Session Planning",
    description:
      "Plan outreach and fixed-post vaccination sessions with intelligent village assignment by distance, population, terrain, and cold chain.",
  },
  {
    icon: Users,
    title: "Multi-Source Population Data",
    description:
      "Fuse census, HMIS, DHIS2, WorldPop and local enumeration sources with confidence scoring — country-by-country.",
  },
  {
    icon: Pill,
    title: "Vaccine & Supply Forecasting",
    description:
      "Auto-calculate vaccine, diluent, syringe, and safety-box requirements per session, per facility, per district.",
  },
  {
    icon: Shield,
    title: "Hierarchical Approvals",
    description:
      "Facility → District → Province → National workflows that mirror how Ministries of Health actually approve microplans.",
  },
  {
    icon: Cloud,
    title: "Offline-First Design",
    description:
      "Built for last-mile health workers. Capture in the bush, sync when bandwidth returns. No data lost.",
  },
  {
    icon: BarChart3,
    title: "Budget Planning",
    description:
      "Per-country currency, allowances, fuel and per-diem rates — generate defensible budgets that survive donor review.",
  },
  {
    icon: HeartPulse,
    title: "Hard-to-Reach Scoring",
    description:
      "Quantify equity: which villages get reached last, how far the nearest cold chain is, where children are missed.",
  },
];

const trustPoints = [
  "BYO single sign-on (OIDC, SAML)",
  "Per-country data isolation",
  "DHIS2 / SmartCare / eLMIS / iHRIS friendly",
  "Audit log on every change",
];

function PasswordLoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState("");

  const { data: tenants } = useQuery<PublicTenant[]>({
    queryKey: ["/api/public/tenants"],
  });

  function resetState() {
    setError(null);
    setNotice(null);
    setBusy(false);
    setSelectedTenantId("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password, tenantId: selectedTenantId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Login failed.");
        return;
      }
      window.location.href = "/";
    } catch (err) {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      setNotice(
        data?.message ||
          "If an account exists for that email, your administrator has been notified to help you reset your password.",
      );
    } catch (err) {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setMode("login");
          resetState();
        }
      }}
    >
      <DialogContent className="p-0 overflow-hidden sm:max-w-3xl gap-0">
        <DialogTitle className="sr-only">Sign in to VaxPlan</DialogTitle>
        <DialogDescription className="sr-only">
          Sign in with the email and password your VaxPlan administrator gave you.
        </DialogDescription>
        <div className="grid md:grid-cols-2">
          {/* Brand panel */}
          <div className="relative hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-primary via-sky-700 to-sky-800 text-white overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <Syringe className="absolute top-6 left-6 h-24 w-24 -rotate-12" />
              <HeartPulse className="absolute bottom-10 left-10 h-28 w-28" />
              <Stethoscope className="absolute top-1/2 right-4 h-32 w-32 rotate-12" />
            </div>
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                <HeartPulse className="h-6 w-6" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-semibold">VaxPlan</span>
                <span className="text-xs text-white/80">
                  Health microplanning for Ministries
                </span>
              </div>
            </div>
            <div className="relative space-y-3">
              <h2 className="text-2xl font-bold leading-snug">
                Reach every child.
                <br />
                Plan every session.
              </h2>
              <p className="text-sm text-white/85 max-w-xs">
                Secure, country-isolated microplanning for national immunization
                programs — from the capital down to the last village.
              </p>
            </div>
            <div className="relative flex items-center gap-2 text-xs text-white/80">
              <Shield className="h-4 w-4" />
              Encrypted · Audit-logged · Per-country data isolation
            </div>
          </div>

          {/* Form panel */}
          <div className="p-8 flex flex-col justify-center">
            {mode === "login" ? (
              <>
                <div className="mb-6 space-y-1">
                  <h3 className="text-xl font-semibold tracking-tight">Welcome back</h3>
                  <p className="text-sm text-muted-foreground">
                    Sign in to your VaxPlan account to continue.
                  </p>
                </div>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-tenant">Country / Program</Label>
                    <select
                      id="pw-tenant"
                      required
                      value={selectedTenantId}
                      onChange={(e) => setSelectedTenantId(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                      data-testid="select-tenant"
                    >
                      <option value="">Select country...</option>
                      {tenants?.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-email">Email</Label>
                    <Input
                      id="pw-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@ministry.gov"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pw-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => {
                          resetState();
                          setMode("forgot");
                        }}
                        className="text-xs text-primary hover:underline"
                        data-testid="button-forgot-password"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="pw-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div className="text-sm text-destructive" data-testid="text-login-error">
                      {error}
                    </div>
                  )}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={busy}
                    data-testid="button-submit-login"
                  >
                    {busy ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Need access?{" "}
                  <a href="/signup" className="text-primary font-medium hover:underline">
                    Request an account
                  </a>
                </p>
              </>
            ) : (
              <>
                <div className="mb-6 space-y-1">
                  <h3 className="text-xl font-semibold tracking-tight">Reset your password</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your email and we'll notify your VaxPlan administrator to
                    help you regain access.
                  </p>
                </div>
                <form onSubmit={submitForgot} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@ministry.gov"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-forgot-email"
                    />
                  </div>
                  {notice && (
                    <div
                      className="text-sm rounded-md bg-primary/10 text-foreground px-3 py-2"
                      data-testid="text-forgot-notice"
                    >
                      {notice}
                    </div>
                  )}
                  {error && (
                    <div className="text-sm text-destructive" data-testid="text-forgot-error">
                      {error}
                    </div>
                  )}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={busy}
                    data-testid="button-submit-forgot"
                  >
                    {busy ? "Sending…" : "Send reset request"}
                  </Button>
                </form>
                <button
                  type="button"
                  onClick={() => {
                    resetState();
                    setMode("login");
                  }}
                  className="mt-6 text-center text-sm text-primary hover:underline mx-auto"
                  data-testid="button-back-to-login"
                >
                  ← Back to sign in
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TenantCard({ tenant }: { tenant: PublicTenant }) {
  return (
    <Card
      className="hover-elevate"
      data-testid={`card-tenant-${tenant.code}`}
    >
      <CardContent className="p-5 flex items-start gap-4">
        <div className="flex-shrink-0 h-12 w-12 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-sm tracking-wider">
          {tenant.countryCode}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight" data-testid={`text-tenant-name-${tenant.code}`}>
            {tenant.name}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Ministry of Health · live tenant
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Landing() {
  const { data: tenants } = useQuery<PublicTenant[]>({
    queryKey: ["/api/public/tenants"],
  });
  const tenantCount = tenants?.length ?? 0;
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <PageHead
        title="VaxPlan · Health Microplanning for Ministries"
        description="Multi-tenant GIS microplanning platform for national immunization and primary-care programs. Map facilities, plan sessions, forecast vaccines, approve budgets."
        image="/og-card.png"
      />
      <PasswordLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3" data-testid="brand-header">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">VaxPlan</span>
              <span className="text-xs text-muted-foreground">
                Health microplanning for Ministries
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" asChild data-testid="button-request-access">
              <a href="/signup">Request access</a>
            </Button>
            <Button onClick={() => setLoginOpen(true)} data-testid="button-login">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32">
          {/* Health-themed background motif */}
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] dark:opacity-[0.08]">
            <div className="absolute top-10 left-[8%] -rotate-12">
              <Syringe className="h-32 w-32" />
            </div>
            <div className="absolute top-1/3 right-[10%] rotate-12">
              <Stethoscope className="h-40 w-40" />
            </div>
            <div className="absolute bottom-10 left-[20%]">
              <HeartPulse className="h-28 w-28" />
            </div>
            <div className="absolute bottom-20 right-[20%] -rotate-6">
              <Activity className="h-32 w-32" />
            </div>
          </div>

          <div className="container mx-auto px-4 max-w-6xl text-center">
            <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-4">
              Intelligent Microplanning for Last-Mile Immunisation Delivery
            </p>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Reach every child. <span className="text-primary">Plan every session.</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              A spatial microplanning platform for immunization, primary care, and outreach —
              used by national EPI programs to map facilities, forecast vaccines, budget sessions,
              and approve plans, all the way down to the last village.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="#features">Explore Features</a>
              </Button>
              <Button size="lg" variant="outline" onClick={() => setLoginOpen(true)}>
                Request Demo / Sign In
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 pt-8 text-xs text-muted-foreground">
              {trustPoints.map((p) => (
                <Badge key={p} variant="secondary" className="font-normal">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="py-20 bg-muted/30 border-y">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-6">The Challenge</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Despite global progress in immunisation, millions of children remain unvaccinated or under-vaccinated due to:
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 text-left">
              <div className="bg-background p-6 rounded-xl border shadow-sm">
                <Building2 className="h-8 w-8 text-destructive mb-4" />
                <h3 className="font-semibold mb-2">Poor Microplanning</h3>
                <p className="text-sm text-muted-foreground">At the facility level with inaccurate or outdated population data.</p>
              </div>
              <div className="bg-background p-6 rounded-xl border shadow-sm">
                <Map className="h-8 w-8 text-destructive mb-4" />
                <h3 className="font-semibold mb-2">Weak Mapping</h3>
                <p className="text-sm text-muted-foreground">Unclear catchment areas and limited visibility of hard-to-reach communities.</p>
              </div>
              <div className="bg-background p-6 rounded-xl border shadow-sm">
                <Calendar className="h-8 w-8 text-destructive mb-4" />
                <h3 className="font-semibold mb-2">Inefficient Scheduling</h3>
                <p className="text-sm text-muted-foreground">Suboptimal outreach session planning resulting in missed populations.</p>
              </div>
            </div>
            <p className="mt-8 text-sm text-muted-foreground italic">
              These challenges are consistently highlighted in global immunisation strengthening frameworks (WHO, 2013; UNICEF, 2018; Gavi, 2020).
            </p>
          </div>
        </section>

        {/* Live tenants */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-sm text-primary mb-2">
                <Globe className="h-4 w-4" />
                Ministries already on the platform
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {tenantCount > 0
                  ? `${tenantCount} National Health Programs · One Platform`
                  : "National Health Programs on the Platform"}
              </h2>
            </div>

            <div
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto"
              data-testid="grid-tenants"
            >
              {(tenants ?? []).map((t) => (
                <TenantCard key={t.id} tenant={t} />
              ))}
              <Card className="border-dashed hover-elevate" data-testid="card-tenant-cta">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Your Ministry next?</div>
                    <a
                      href="/signup"
                      className="text-xs text-primary inline-flex items-center gap-1 mt-1 hover:underline"
                    >
                      Request onboarding <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features / The Solution */}
        <section id="features" className="py-24 bg-muted/40 border-y">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">The Solution: GIS-Powered Intelligence</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                VaxPlan transforms traditional microplanning into a data-driven system. It integrates population data, catchment areas, service schedules, optimization logic, and coverage gap analysis.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: "GIS-Based Catchment Mapping", desc: "Visualise real service areas and identify underserved populations.", icon: Map },
                { title: "Microplanning Engine", desc: "Automatically generate outreach plans based on population needs and facility capacity.", icon: Building2 },
                { title: "Zero-Dose Tracking", desc: "Identify children who have not received any routine vaccines.", icon: Users },
                { title: "Coverage Gap Analysis", desc: "Detect missed communities and low-coverage pockets.", icon: EyeOff },
                { title: "Session Optimization", desc: "Recommend optimal outreach schedules based on geography and demand.", icon: Calendar },
                { title: "Real-Time Dashboards", desc: "Monitor coverage, session performance, and planning gaps.", icon: BarChart3 },
                { title: "Offline-First Capability", desc: "Supports low-connectivity environments for field usability.", icon: Cloud },
              ].map((feature, i) => (
                <Card key={i} className="hover-elevate border-none shadow-sm">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-xl mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap / Coming Soon Section */}
        <section className="py-24 bg-gradient-to-b from-background to-muted/20 border-t">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16">
              <Badge className="mb-3 px-3 py-1 text-xs uppercase tracking-wider bg-primary/15 text-primary border-none">
                Roadmap
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Coming Soon: Expanding the Horizon</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We are actively developing new capabilities to bring VaxPlan to the last mile, streamline data integration, and optimize field activities.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Native Android Application",
                  desc: "Fully-featured offline-first mobile app for community health workers (CHWs) to map villages, register zero-dose children, and record sessions in real time.",
                  status: "Development",
                  tagColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                },
                {
                  title: "Native Windows Desktop Client",
                  desc: "Offline Windows application for facility managers and district offices with low connectivity, allowing full local planning that syncs when network is available.",
                  status: "Design Phase",
                  tagColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                },
                {
                  title: "Direct DHIS2 Data Ingestion",
                  desc: "Bi-directional integration with national DHIS2 instances to pull routine immunization coverage statistics, target populations, and report microplanning achievements.",
                  status: "Integration Test",
                  tagColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                },
                {
                  title: "AI Predictive Stock Logistics",
                  desc: "Machine learning models analyzing stock consumption and storage limits to forecast and prevent vaccine stockouts before outreach campaigns begin.",
                  status: "Research Phase",
                  tagColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                },
                {
                  title: "Dynamic Route Optimization",
                  desc: "Advanced GIS routing algorithms factoring in weather, road types, and seasonal river crossings to plan the safest and most efficient path for health workers.",
                  status: "Planning",
                  tagColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
                },
                {
                  title: "Automated Caregiver SMS Alerts",
                  desc: "Localized SMS broadcasting to notify mothers and caregivers of upcoming outreach sessions in their immediate village, boosting coverage rates.",
                  status: "Planning",
                  tagColor: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
                },
              ].map((item, i) => (
                <Card key={i} className="hover-elevate relative overflow-hidden border bg-background/50 backdrop-blur">
                  <div className="absolute top-4 right-4">
                    <Badge variant="outline" className={`border-none ${item.tagColor} text-xs font-semibold px-2 py-0.5`}>
                      {item.status}
                    </Badge>
                  </div>
                  <CardContent className="p-6 pt-10">
                    <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">How It Works</h2>
            <div className="space-y-6">
              {[
                { step: "Step 1: Data Integration", desc: "Import facility, population, and catchment data." },
                { step: "Step 2: Mapping & Analysis", desc: "Automatically map communities to nearest service delivery points." },
                { step: "Step 3: Gap Identification", desc: "Highlight underserved populations and zero-dose clusters." },
                { step: "Step 4: Microplan Generation", desc: "Generate actionable outreach and facility session plans." },
                { step: "Step 5: Monitoring & Feedback", desc: "Track performance and continuously refine plans." },
              ].map((item, i) => (
                <div key={i} className="flex gap-6 items-center p-6 rounded-2xl bg-card border hover:shadow-md transition">
                  <div className="flex-shrink-0 h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl mb-1">{item.step}</h3>
                    <p className="text-muted-foreground text-lg">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Standards Alignment */}
        <section className="py-20 bg-muted/30 border-y">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-6">Standards Alignment</h2>
            <p className="text-lg text-muted-foreground mb-8">
              VaxPlan is designed to align with global immunisation microplanning frameworks and digital health principles:
            </p>
            <div className="grid sm:grid-cols-3 gap-6 text-left">
              <div className="bg-background p-6 rounded-xl border">
                <h4 className="font-bold text-primary mb-2">WHO</h4>
                <p className="text-sm">Immunisation microplanning guidance (WHO, 2013)</p>
              </div>
              <div className="bg-background p-6 rounded-xl border">
                <h4 className="font-bold text-primary mb-2">UNICEF</h4>
                <p className="text-sm">Data-driven service delivery approaches (UNICEF, 2018)</p>
              </div>
              <div className="bg-background p-6 rounded-xl border">
                <h4 className="font-bold text-primary mb-2">Gavi</h4>
                <p className="text-sm">Health system strengthening priorities (Gavi, 2020)</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-primary text-primary-foreground text-center">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to improve immunisation coverage in your system?
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-10">
              Moves from static planning to adaptive intelligence. Bridges data gaps in rural and urban health systems.
              Supports equitable vaccine distribution. Enables evidence-based decision-making at all levels.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-primary" onClick={() => setLoginOpen(true)}>
                Explore Dashboard
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent border-primary-foreground/20 hover:bg-primary-foreground/10 text-primary-foreground" asChild>
                <a href="/signup">Integrate VaxPlan</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
                <HeartPulse className="h-3 w-3" />
              </div>
              <span>VaxPlan · Health Microplanning Platform</span>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-4 text-xs">
              <a href="#features" className="text-primary hover:underline font-medium">
                Features
              </a>
              <a href="/help" className="text-primary hover:underline font-medium">
                Help Center
              </a>
              <a
                href="/help"
                className="text-primary hover:underline"
                data-testid="link-footer-help"
              >
                Help &amp; User Guide
              </a>
              <a
                href="/data-sources"
                className="text-primary hover:underline font-medium"
                data-testid="link-footer-data-sources"
              >
                Data Sources
              </a>
              <span className="hidden lg:inline text-muted-foreground ml-2">
                Built for national immunization programs · Multi-tenant SaaS
              </span>
            </div>
          </div>
          <div className="mt-3 text-center text-[11px] text-muted-foreground/80" data-testid="landing-version">
            {versionLabel()}
          </div>
        </div>
      </footer>

    </div>
  );
}
