import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
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

  return (
    <div className="min-h-screen bg-background">
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
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
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
                <Button size="lg" variant="outline" asChild data-testid="button-login-hero">
                  <a href="/api/login">Sign in</a>
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

        {/* Demo Credentials Console */}
        <section className="py-12 bg-indigo-500/5 border-y border-indigo-500/10">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full mb-2">
                <Shield className="h-3.5 w-3.5" />
                Demo Credentials Sandbox
              </div>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Select a Pre-Seeded Test Identity</h2>
              <p className="text-muted-foreground mt-1 max-w-lg mx-auto text-sm font-sans">
                Experience the granular user management and dynamic geographic row-level access controls by logging in with one click.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  email: "national.admin@vaxplan.org",
                  title: "National Admin",
                  desc: "Unrestricted global control. Access all settings, borders, and national logs.",
                  color: "border-indigo-500/30 hover:border-indigo-500 bg-indigo-500/[0.02]",
                  textColor: "text-indigo-400"
                },
                {
                  email: "provincial.coord@vaxplan.org",
                  title: "Provincial Coordinator",
                  desc: "Highlands Province only. Manage staff, view districts/clinics in Highlands.",
                  color: "border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/[0.02]",
                  textColor: "text-emerald-400"
                },
                {
                  email: "district.mgr@vaxplan.org",
                  title: "District Manager",
                  desc: "District A only. Author and approve sessions, review microplan budgets.",
                  color: "border-sky-500/30 hover:border-sky-500 bg-sky-500/[0.02]",
                  textColor: "text-sky-400"
                },
                {
                  email: "facility.clerk@vaxplan.org",
                  title: "Facility Clerk (Dual-Role)",
                  desc: "Facility A only. Log vaccinations (override) + manage catchment maps.",
                  color: "border-amber-500/30 hover:border-amber-500 bg-amber-500/[0.02]",
                  textColor: "text-amber-400"
                }
              ].map((c) => (
                <a 
                  key={c.email}
                  href={`/api/login?email=${c.email}`}
                  className={`flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg text-left group cursor-pointer ${c.color}`}
                >
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${c.textColor}`}>{c.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono block mb-3 truncate">{c.email}</span>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed font-sans">{c.desc}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold mt-4 ${c.textColor} group-hover:translate-x-1 transition-transform`}>
                    Login Instant <ArrowRight className="h-3 w-3" />
                  </span>
                </a>
              ))}
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
              <Button size="lg" variant="outline" asChild data-testid="button-cta-signin">
                <a href="/api/login">Sign in</a>
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
            <div className="text-xs">
              Built for national immunization programs · Multi-tenant SaaS
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
