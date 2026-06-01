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

  function resetState() {
    setError(null);
    setNotice(null);
    setBusy(false);
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
        body: JSON.stringify({ email: email.trim(), password }),
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
        {/* Hero */}
        <section className="relative overflow-hidden py-20 md:py-32">
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

          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary" data-testid="badge-multitenant">
                <Globe className="h-4 w-4" />
                Multi-country · Multi-tenant · Built for Ministries of Health
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Reach every child.{" "}
                <span className="text-primary">Plan every session.</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                A spatial microplanning platform for immunization, primary care,
                and outreach — used by national EPI programs to map facilities,
                forecast vaccines, budget sessions, and approve plans, all the
                way down to the last village.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button size="lg" asChild data-testid="button-get-started">
                  <a href="/signup">
                    Bring your Ministry on board
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" onClick={() => setLoginOpen(true)} data-testid="button-login-hero">
                  Sign in
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
                {trustPoints.map((p) => (
                  <Badge key={p} variant="secondary" className="font-normal">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Live tenants */}
        <section className="py-16 bg-muted/40 border-y">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-sm text-primary mb-2">
                <Building2 className="h-4 w-4" />
                Ministries already on the platform
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {tenantCount > 0
                  ? `${tenantCount} National Health Programs · One Platform`
                  : "National Health Programs on the Platform"}
              </h2>
              <p className="text-muted-foreground mt-2 max-w-xl mx-auto text-sm">
                Each country runs in its own tenant — its own facilities,
                population sources, currency, languages, and admin hierarchy.
                Nothing crosses the border.
              </p>
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
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Your Ministry next?</div>
                    <a
                      href="/signup"
                      className="text-xs text-primary inline-flex items-center gap-1 mt-1 hover:underline"
                      data-testid="link-tenant-onboard"
                    >
                      Request onboarding <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Why it matters — health-oriented impact stats */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { icon: Building2, value: "3,600+", label: "Health facilities mapped" },
                { icon: Syringe, value: "10+", label: "Vaccine antigens supported" },
                { icon: Users, value: "Millions", label: "Children in target population" },
                { icon: HeartPulse, value: "100%", label: "Offline-capable workflows" },
              ].map((s) => (
                <div key={s.label} className="text-center" data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-primary">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-muted/40 border-y">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">
                Built for the realities of frontline health
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Cold chain, river crossings, motorbike outreach, paper logbooks,
                hard-to-reach communities — VaxPlan models the work the way it
                actually happens.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="hover-elevate h-full" data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">From facility map to approved plan</h2>
                <p className="text-muted-foreground">
                  The same workflow your EPI team already runs — just faster, spatial, and auditable.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    icon: Building2,
                    title: "Register facilities & villages",
                    description:
                      "Import HMIS / DHIS2 facility lists, geo-tag villages, define catchments.",
                  },
                  {
                    icon: Users,
                    title: "Capture target populations",
                    description:
                      "Pull census, head-counts, microplanning numbers — track confidence and source.",
                  },
                  {
                    icon: Calendar,
                    title: "Plan vaccination sessions",
                    description:
                      "Group villages into sessions, assign teams, calculate vaccines, fuel, allowances.",
                  },
                  {
                    icon: Shield,
                    title: "Submit for hierarchical approval",
                    description:
                      "Facility → District → Province → National. Every signoff stored in the audit log.",
                  },
                ].map((item, i) => (
                  <div
                    key={item.title}
                    className="flex gap-4 items-start p-5 rounded-lg bg-card border"
                    data-testid={`step-${i + 1}`}
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-primary/5 border-t">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-6">
              <Stethoscope className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-bold mb-4">
              Ready to plan immunization the spatial way?
            </h2>
            <p className="text-muted-foreground mb-8">
              Whether you're a facility clerk capturing one village, or a
              National EPI Manager approving a country-wide plan — there's a
              role for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <Button size="lg" asChild data-testid="button-cta-signup">
                <a href="/signup">Request access</a>
              </Button>
              <Button size="lg" variant="outline" onClick={() => setLoginOpen(true)} data-testid="button-cta-signin">
                Sign in
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
            <div className="flex items-center gap-4 text-xs">
              <a
                href="/data-sources"
                className="text-primary hover:underline"
                data-testid="link-footer-data-sources"
              >
                Data Sources &amp; Acknowledgements
              </a>
              <span className="hidden sm:inline">
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
