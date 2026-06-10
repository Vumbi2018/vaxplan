import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageHead } from "@/components/PageHead";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle2, Globe, Sparkles, HeartPulse } from "lucide-react";
import { Link } from "wouter";
import { COUNTRIES, COUNTRIES_BY_CODE, type Country } from "@shared/countries";

interface PublicTenant {
  id: string;
  code: string;
  name: string;
  countryCode: string;
}

// Self-service form intentionally excludes national_admin — that role can only
// be granted by an existing admin, never requested through the public form.
const ROLE_OPTIONS = [
  { value: "facility_clerk", label: "Facility Clerk" },
  { value: "facility_in_charge", label: "Facility In-Charge" },
  { value: "district_manager", label: "District Manager" },
  { value: "provincial_coordinator", label: "Provincial Coordinator" },
  { value: "gis_specialist", label: "GIS Specialist" },
];

// Two-mode form: when the chosen country has a live tenant, we collect signup
// info (`tenantId` is filled from the tenant lookup); when the country is not
// yet on the platform, we collect onboarding-interest info (`organization` etc).
const formSchema = z.object({
  countryCode: z.string().length(3, "Please choose a country"),
  fullName: z.string().min(2, "Please enter your full name").max(255),
  email: z.string().email("Please enter a valid work email").max(255),
  requestedRole: z.string().min(1, "Please choose a role"),
  organization: z.string().max(255).optional(),
  justification: z.string().max(2000).optional(),
});
type FormValues = z.infer<typeof formSchema>;

const REGION_ORDER: Country["region"][] = ["Africa", "Asia", "Pacific", "Americas", "Europe"];

export default function Signup() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState<null | "joined" | "interest">(null);

  const { data: tenants, isLoading: loadingTenants } = useQuery<PublicTenant[]>({
    queryKey: ["/api/public/tenants"],
  });

  // country code → live tenant (if any)
  const tenantByCountry = useMemo(() => {
    const m = new Map<string, PublicTenant>();
    (tenants ?? []).forEach((t) => {
      if (t.countryCode) m.set(t.countryCode.toUpperCase(), t);
    });
    return m;
  }, [tenants]);

  // group countries by region for the dropdown, marking which are live
  const countriesByRegion = useMemo(() => {
    const groups: Record<string, Country[]> = {};
    COUNTRIES.forEach((c) => {
      (groups[c.region] ||= []).push(c);
    });
    REGION_ORDER.forEach((r) => groups[r]?.sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      countryCode: "",
      fullName: "",
      email: "",
      requestedRole: "",
      organization: "",
      justification: "",
    },
  });

  const watchedCountry = form.watch("countryCode");
  const liveTenant = watchedCountry ? tenantByCountry.get(watchedCountry) : undefined;
  const isOnboardingMode = !!watchedCountry && !liveTenant;

  const submit = useMutation({
    mutationFn: async (values: FormValues) => {
      const country = COUNTRIES_BY_CODE[values.countryCode];
      const live = tenantByCountry.get(values.countryCode);
      if (live) {
        // Signup against an existing tenant.
        return apiRequest("POST", "/api/public/signup-requests", {
          tenantId: live.id,
          fullName: values.fullName,
          email: values.email,
          requestedRole: values.requestedRole,
          justification: values.justification || undefined,
        });
      }
      // Onboarding-interest lead for a country not yet on the platform.
      return apiRequest("POST", "/api/public/onboarding-interest", {
        countryCode: values.countryCode,
        countryName: country?.name ?? values.countryCode,
        organization: values.organization || undefined,
        fullName: values.fullName,
        email: values.email,
        requestedRole: values.requestedRole,
        justification: values.justification || undefined,
      });
    },
    onSuccess: () => setSubmitted(isOnboardingMode ? "interest" : "joined"),
    onError: (err: Error) => {
      toast({
        title: "Could not submit request",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHead
        title="Request Access · VaxPlan"
        description="Request access to VaxPlan, the multi-tenant GIS microplanning platform for national immunization and primary-care programs."
        image="/og-card.png"
      />
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" data-testid="link-home">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">VaxPlan</span>
              <span className="text-xs text-muted-foreground">Request access</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-xl">
        {submitted === "joined" ? (
          <Card data-testid="card-signup-success">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Request submitted</CardTitle>
              <CardDescription>
                Your country administrator will review your request and notify
                you. Once approved, sign in with the same email to access the
                platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild data-testid="button-back-home">
                <Link href="/">Back to home</Link>
              </Button>
            </CardContent>
          </Card>
        ) : submitted === "interest" ? (
          <Card data-testid="card-interest-success">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Thank you — we've recorded your interest</CardTitle>
              <CardDescription>
                Your country isn't on the platform yet. The platform team will
                reach out to discuss onboarding your Ministry of Health. You
                won't be able to sign in until your country is provisioned as a
                tenant.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild data-testid="button-back-home">
                <Link href="/">Back to home</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="inline-flex items-center gap-2 text-sm text-primary mb-1">
                <Globe className="h-4 w-4" /> Self-service access
              </div>
              <CardTitle>Request access to the platform</CardTitle>
              <CardDescription>
                Pick your country. If your Ministry is already on the platform
                we'll route this to your national administrator. If not, we'll
                record your interest and reach out to start onboarding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((v) => submit.mutate(v))}
                  className="space-y-5"
                >
                  <FormField
                    control={form.control}
                    name="countryCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={loadingTenants}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-country">
                              <SelectValue
                                placeholder={loadingTenants ? "Loading…" : "Choose a country"}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-80">
                            {REGION_ORDER.filter((r) => countriesByRegion[r]?.length).map((region) => (
                              <SelectGroup key={region}>
                                <SelectLabel>{region}</SelectLabel>
                                {countriesByRegion[region].map((c) => {
                                  const live = tenantByCountry.has(c.code);
                                  return (
                                    <SelectItem
                                      key={c.code}
                                      value={c.code}
                                      data-testid={`option-country-${c.code}`}
                                    >
                                      <span className="inline-flex items-center gap-2">
                                        {c.name}
                                        {live && (
                                          <Badge
                                            variant="secondary"
                                            className="bg-emerald-500/10 text-emerald-600 text-[10px] px-1.5 py-0 h-4"
                                          >
                                            Live
                                          </Badge>
                                        )}
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Mode banner */}
                  {liveTenant && (
                    <Alert className="border-emerald-500/30 bg-emerald-500/5" data-testid="banner-live-tenant">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-sm">
                        <strong>{liveTenant.name}</strong> is on the platform. Your
                        request will be sent to their national administrator.
                      </AlertDescription>
                    </Alert>
                  )}
                  {isOnboardingMode && (
                    <Alert className="border-amber-500/30 bg-amber-500/5" data-testid="banner-onboarding">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-sm">
                        <strong>{COUNTRIES_BY_CODE[watchedCountry]?.name}</strong> isn't
                        on the platform yet. Submit this form to register your
                        interest — the platform team will get in touch about
                        onboarding your Ministry. <em>You will not get access
                        immediately.</em>
                      </AlertDescription>
                    </Alert>
                  )}

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" data-testid="input-fullName" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="jane@health.gov"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {isOnboardingMode
                            ? "We'll use this to reach out about onboarding."
                            : "You'll sign in with this email after approval."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isOnboardingMode && (
                    <FormField
                      control={form.control}
                      name="organization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ministry / Organization</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Ministry of Health, EPI Programme"
                              data-testid="input-organization"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="requestedRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Choose a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem
                                key={r.value}
                                value={r.value}
                                data-testid={`option-role-${r.value}`}
                              >
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="justification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {isOnboardingMode
                            ? "Tell us about your programme (optional)"
                            : "Why do you need access? (optional)"}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={
                              isOnboardingMode
                                ? "Brief description of your country's EPI programme, the geography you cover, and what you'd use VaxPlan for."
                                : "Briefly describe your work and which area you support."
                            }
                            rows={4}
                            data-testid="input-justification"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submit.isPending || !watchedCountry}
                    data-testid="button-submit-signup"
                  >
                    {submit.isPending
                      ? "Submitting…"
                      : isOnboardingMode
                      ? "Register onboarding interest"
                      : "Submit access request"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
