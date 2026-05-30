import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Globe } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  loadActiveTenant,
  loadTenantsCache,
  saveTenantsCache,
  mergeWithActive,
  type CachedTenant,
} from "@/lib/tenantCache";

interface User {
  id: string;
  tenantId?: string | null;
}

interface MyTenant {
  id: string;
  code: string;
  name: string;
  countryCode?: string | null;
}

interface PublicTenant {
  id: string;
  code: string;
  name: string;
  countryCode?: string | null;
  settings?: { isDemo?: boolean };
}

export function TenantSwitcher() {
  const { toast } = useToast();
  const { data: user } = useQuery<User>({ queryKey: ["/api/auth/user"], retry: false });
  const { data: activeTenant } = useQuery<MyTenant>({
    queryKey: ["/api/me/tenant"],
    retry: false,
    enabled: !!user,
  });
  const { data: tenants } = useQuery<PublicTenant[]>({
    queryKey: ["/api/public/tenants"],
    enabled: !!user,
    // Seed from the offline cache so the dropdown is populated immediately and
    // stays usable when the network request can't complete.
    initialData: () => {
      const cached = loadTenantsCache();
      return cached.length ? (cached as PublicTenant[]) : undefined;
    },
  });

  // Persist every successful list fetch for offline reuse.
  useEffect(() => {
    if (tenants && tenants.length) {
      saveTenantsCache(tenants as CachedTenant[]);
    }
  }, [tenants]);

  const switchTenant = useMutation({
    mutationFn: async (tenantId: string) =>
      apiRequest("POST", "/api/me/switch-tenant", { tenantId }),
    onSuccess: (_data: any, tenantId: string) => {
      const matched = (tenants ?? []).find((t) => t.id === tenantId);
      if (matched) {
        localStorage.setItem("vaxplan_active_tenant", JSON.stringify(matched));
      } else {
        localStorage.setItem("vaxplan_active_tenant", JSON.stringify({ id: tenantId }));
      }
      window.location.reload();
    },
    onError: (err: Error) =>
      toast({
        title: "Could not switch country",
        description: err.message,
        variant: "destructive",
      }),
  });

  if (!user) return null;

  // Resolve the active tenant from the live query, falling back to the cached
  // copy written by App.tsx (so the active country is known even offline).
  const cachedActive = loadActiveTenant();
  const effectiveActive: CachedTenant | null = activeTenant
    ? (activeTenant as CachedTenant)
    : cachedActive;

  // Base list: live query → offline cache. Drop demo tenants from the picker.
  const baseList = ((tenants ?? loadTenantsCache()) as CachedTenant[]).filter(
    (t) => !(t.settings as any)?.isDemo,
  );

  // Always include the active tenant so the dropdown can never show a country
  // that isn't selectable, and never omit the one currently in use (PNG bug).
  const options = mergeWithActive(baseList, effectiveActive);

  if (options.length < 2 && user.tenantId) {
    // Single-tenant world for this user — no need for a switcher at all.
    return null;
  }

  const sorted = options.slice().sort((a, b) => a.name.localeCompare(b.name));
  const activeId = effectiveActive?.id ?? "";

  return (
    <div
      className="bg-muted/30 border-b"
      data-testid="tenant-switcher"
    >
      <div className="container mx-auto px-4 py-1.5 flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground truncate">
            Active country: <strong className="text-foreground">{effectiveActive?.name ?? "—"}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Globe className="h-3.5 w-3.5 opacity-70" />
          <Select
            value={activeId}
            onValueChange={(v) => v && v !== activeId && switchTenant.mutate(v)}
            disabled={switchTenant.isPending}
          >
            <SelectTrigger
              className="h-7 text-xs bg-background min-w-[220px]"
              data-testid="select-active-tenant"
            >
              <SelectValue placeholder="Choose country…" />
            </SelectTrigger>
            <SelectContent>
              {sorted.map((t) => (
                <SelectItem key={t.id} value={t.id} data-testid={`option-tenant-${t.code}`}>
                  {t.name}{t.countryCode ? ` · ${t.countryCode}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
