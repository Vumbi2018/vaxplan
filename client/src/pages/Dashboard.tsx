import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/StatsCard";
import { MapView } from "@/components/MapView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  Building2,
  Users,
  Calendar,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
  DollarSign,
  Activity,
  Syringe,
} from "lucide-react";
import { Link } from "wouter";
import type { Facility, Village, SessionPlan, BudgetItem, ApprovalRequest, PopulationData } from "@shared/schema";

interface StatsData {
  totalFacilities: number;
  totalVillages: number;
  htrVillages: number;
  totalSessions: number;
  totalPopulation: number;
  activeFacilities: number;
}

interface CoverageVaccine {
  vaccineName: string;
  targetPopulation: number;
  dosesRequired: number;
  administered: number;
  coveragePct: number;
}

interface CoverageData {
  quarter: number;
  year: number;
  facilityId: number | null;
  vaccines: CoverageVaccine[];
  totals: {
    targetPopulation: number;
    administered: number;
    coveragePct: number;
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [liveTime, setLiveTime] = useState(new Date());

  const displayName = useMemo(() => {
    if (user?.firstName || user?.lastName) {
      return [user.firstName, user.lastName].filter(Boolean).join(" ");
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "Officer";
  }, [user]);

  // Dynamic live date & time updating every second
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hr = liveTime.getHours();
    if (hr < 12) return "Good morning";
    if (hr < 18) return "Good afternoon";
    return "Good evening";
  }, [liveTime]);

  const formattedTime = useMemo(() => {
    return (
      liveTime.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }) +
      " · " +
      liveTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }, [liveTime]);

  const { data: facilities, isLoading: loadingFacilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
  });

  const { data: villages, isLoading: loadingVillages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });

  const { data: sessions, isLoading: loadingSessions } = useQuery<SessionPlan[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: stats, isLoading: loadingStats } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
  });

  const { data: budgetItems, isLoading: loadingBudget } = useQuery<BudgetItem[]>({
    queryKey: ["/api/budget-items"],
  });

  const { data: approvals, isLoading: loadingApprovals } = useQuery<ApprovalRequest[]>({
    queryKey: ["/api/approvals"],
  });

  const { data: populationDataList, isLoading: loadingPopulation } = useQuery<PopulationData[]>({
    queryKey: ["/api/population"],
  });

  const { data: allDistricts, isLoading: loadingDistricts } = useQuery<any[]>({
    queryKey: ["/api/districts"],
  });

  const { data: provinces, isLoading: loadingProvinces } = useQuery<any[]>({
    queryKey: ["/api/provinces"],
  });

  const { data: coverage, isLoading: loadingCoverage } = useQuery<CoverageData>({
    queryKey: ["/api/coverage"],
  });

  const htrVillages = stats?.htrVillages || 0;
  const pendingSessions = sessions?.filter((s) => s.status === "planned")?.length || 0;

  // Resolve scoped annual population for the logged entity
  const annualPopulationDisplay = useMemo(() => {
    if (!populationDataList) {
      return { value: stats?.totalPopulation || 0, label: "Target Population" };
    }

    const availableYears = Array.from(new Set(populationDataList.map((p) => p.year))).sort(
      (a, b) => b - a
    );
    const yearsToScan = availableYears.length > 0 ? availableYears : [2026, 2025, 2024, 2023, 2022];

    const findRecordForYears = (criteriaFn: (p: PopulationData) => boolean) => {
      for (const year of yearsToScan) {
        const found = populationDataList.find((p) => p.year === year && criteriaFn(p));
        if (found) {
          return found;
        }
      }
      return null;
    };

    // 1. Facility level
    if (user?.facilityId) {
      const facilityIdNum = Number(user.facilityId);
      const record = findRecordForYears(
        (p) => Number(p.facilityId) === facilityIdNum && !p.villageId
      );
      if (record) {
        return {
          value: record.totalPopulation,
          label: `Facility Annual (${record.year} · ${record.source.toUpperCase()})`,
        };
      }
    }

    // 2. District level
    let targetDistrictId: number | null = null;
    if (user?.districtId) {
      targetDistrictId = Number(user.districtId);
    } else if (user?.facilityId && facilities) {
      const facilityIdNum = Number(user.facilityId);
      const facility = facilities.find((f) => Number(f.id) === facilityIdNum);
      if (facility?.districtId) {
        targetDistrictId = Number(facility.districtId);
      }
    }

    if (targetDistrictId) {
      const record = findRecordForYears(
        (p) => Number(p.districtId) === targetDistrictId && !p.facilityId && !p.villageId
      );
      if (record) {
        return {
          value: record.totalPopulation,
          label: `District Annual (${record.year} · ${record.source.toUpperCase()})`,
        };
      }
    }

    // 3. Provincial level
    let targetProvinceId: number | null = null;
    if (user?.provinceId) {
      targetProvinceId = Number(user.provinceId);
    } else if (targetDistrictId && allDistricts) {
      const district = allDistricts.find((d) => Number(d.id) === targetDistrictId);
      if (district?.provinceId) {
        targetProvinceId = Number(district.provinceId);
      }
    }

    if (targetProvinceId) {
      const record = findRecordForYears(
        (p) => Number(p.provinceId) === targetProvinceId && !p.districtId && !p.facilityId && !p.villageId
      );
      if (record) {
        return {
          value: record.totalPopulation,
          label: `Provincial Annual (${record.year} · ${record.source.toUpperCase()})`,
        };
      }
    }

    // 4. National level
    const record = findRecordForYears(
      (p) => !p.provinceId && !p.districtId && !p.facilityId && !p.villageId
    );
    if (record) {
      return {
        value: record.totalPopulation,
        label: `National Annual (${record.year} · ${record.source.toUpperCase()})`,
      };
    }

    // 5. Fallback
    return {
      value: stats?.totalPopulation || 0,
      label: "Target Population",
    };
  }, [user, populationDataList, facilities, allDistricts, provinces, stats]);

  // ─── Dynamic Microplanning Progress Metrics ───────────────────────────────
  
  // 1. Sessions Conducted / Completed
  const completedSessionsCount = useMemo(() => {
    if (!sessions) return 0;
    return sessions.filter((s) => s.status === "conducted" || s.status === "completed").length;
  }, [sessions]);

  const totalSessionsCount = useMemo(() => {
    if (!sessions) return 0;
    return sessions.length;
  }, [sessions]);

  const sessionsPercentage = useMemo(() => {
    if (totalSessionsCount === 0) return 0;
    return Math.round((completedSessionsCount / totalSessionsCount) * 100);
  }, [completedSessionsCount, totalSessionsCount]);

  // 2. Catchment Villages Assigned to Facilities
  const assignedVillagesCount = useMemo(() => {
    if (!villages) return 0;
    return villages.filter((v) => v.assignedFacilityId !== null).length;
  }, [villages]);

  const totalVillagesCount = useMemo(() => {
    if (!villages) return 0;
    return villages.length;
  }, [villages]);

  const villagesPercentage = useMemo(() => {
    if (totalVillagesCount === 0) return 0;
    return Math.round((assignedVillagesCount / totalVillagesCount) * 100);
  }, [assignedVillagesCount, totalVillagesCount]);

  // 3. Approved Budgets
  const totalBudgetSum = useMemo(() => {
    if (!budgetItems) return 0;
    return budgetItems.reduce((sum, item) => sum + Number(item.totalCost), 0);
  }, [budgetItems]);

  const approvedBudgetSum = useMemo(() => {
    if (!budgetItems) return 0;
    return budgetItems
      .filter((item) => item.approvalStatus === "approved")
      .reduce((sum, item) => sum + Number(item.totalCost), 0);
  }, [budgetItems]);

  const budgetPercentage = useMemo(() => {
    if (totalBudgetSum === 0) return 0;
    return Math.round((approvedBudgetSum / totalBudgetSum) * 100);
  }, [approvedBudgetSum, totalBudgetSum]);

  // 4. Pending Approvals list
  const pendingApprovals = useMemo(() => {
    if (!approvals) return [];
    return approvals.filter((a) => a.status === "pending");
  }, [approvals]);

  // 5. Recent Context-aware Activity Feed
  const recentActivities = useMemo(() => {
    const list = [];
    
    if (sessions && sessions.length > 0) {
      const sorted = [...sessions].sort((a, b) => b.id - a.id).slice(0, 2);
      sorted.forEach((s) => {
        list.push({
          action: s.status === "planned" ? "Microplan drafted" : `Session marked ${s.status}`,
          facility: s.name,
          time: "Just now",
          status: s.approvalStatus || "draft",
        });
      });
    }
    
    if (budgetItems && budgetItems.length > 0) {
      const sorted = [...budgetItems].sort((a, b) => b.id - a.id).slice(0, 2);
      sorted.forEach((b) => {
        list.push({
          action: `Budget item: ${b.description}`,
          facility: `Allocated cost: $${Number(b.totalCost).toLocaleString()}`,
          time: "Recently updated",
          status: b.approvalStatus || "draft",
        });
      });
    }

    // Standard Fallbacks
    if (list.length < 4) {
      list.push(
        {
          action: "HTR assessment completed",
          facility: "Hilltop Aid Post",
          time: "2 hours ago",
          status: "pending",
        },
        {
          action: "Population data updated",
          facility: "Mountview Health Centre",
          time: "5 hours ago",
          status: "approved",
        }
      );
    }
    
    return list.slice(0, 4);
  }, [sessions, budgetItems]);

  const isLoading = 
    loadingFacilities || 
    loadingVillages || 
    loadingSessions || 
    loadingStats || 
    loadingBudget || 
    loadingApprovals ||
    loadingPopulation ||
    loadingDistricts ||
    loadingProvinces;

  const coverageBarColor = (pct: number) => {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Premium Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 shadow-sm">
        <div className="absolute right-0 top-0 h-40 w-40 bg-primary/5 rounded-full filter blur-2xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary animate-pulse shrink-0" />
              {greeting}, {displayName}!
            </h1>
            <p className="text-muted-foreground text-sm">
              Welcome back to VaxPlan GIS-Microplanning panel.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-background/50 border backdrop-blur-md px-4 py-2 rounded-xl text-xs font-mono font-bold text-muted-foreground shadow-sm w-fit shrink-0">
            <Clock className="h-4 w-4 text-primary shrink-0 animate-spin animate-duration-10000" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Health Facilities"
              value={facilities?.length || 0}
              subtitle="Active facilities in system"
              icon={Building2}
              trend={{ value: 5, isPositive: true }}
            />
            <StatsCard
              title="Annual Population"
              value={annualPopulationDisplay.value.toLocaleString()}
              subtitle={annualPopulationDisplay.label}
              icon={Users}
            />
            <StatsCard
              title="Planned Sessions"
              value={pendingSessions}
              subtitle="Sessions pending this quarter"
              icon={Calendar}
            />
            <StatsCard
              title="Hard-to-Reach"
              value={htrVillages}
              subtitle="Villages requiring special attention"
              icon={AlertTriangle}
            />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Facility Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-80">
              <MapView
                facilities={facilities || []}
                villages={villages || []}
                height="100%"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" data-testid="button-view-all-activity">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.facility}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Badge
                    variant={activity.status === "approved" ? "secondary" : "outline"}
                    className="text-xs flex-shrink-0 capitalize"
                  >
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Syringe className="h-5 w-5 text-primary" />
              Vaccine Coverage
            </CardTitle>
            {coverage && (
              <Badge variant="secondary">
                Q{coverage.quarter} {coverage.year} · {coverage.totals.coveragePct}% overall
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {loadingCoverage ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !coverage || coverage.vaccines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 border border-dashed rounded-xl bg-muted/20">
              <Syringe className="h-8 w-8 text-muted-foreground shrink-0" />
              <p className="text-sm font-semibold text-foreground">No vaccine targets set</p>
              <p className="text-xs text-muted-foreground max-w-[320px]">
                Add vaccine requirements for this quarter to track coverage against target population.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {coverage.vaccines.map((v) => (
                <div
                  key={v.vaccineName}
                  className="rounded-xl border bg-card p-3 space-y-2"
                  data-testid={`coverage-${v.vaccineName}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {v.vaccineName}
                    </span>
                    <span className="text-base font-mono font-bold text-foreground">
                      {v.coveragePct}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${coverageBarColor(v.coveragePct)}`}
                      style={{ width: `${Math.min(v.coveragePct, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {v.administered.toLocaleString()} administered of{" "}
                    {v.targetPopulation.toLocaleString()} target
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Quarterly Microplanning Goals</CardTitle>
              <Badge variant="secondary">Q4 2026</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-3">
            {[
              { 
                label: "Sessions Completed", 
                current: completedSessionsCount, 
                target: totalSessionsCount, 
                percent: sessionsPercentage,
                description: `${completedSessionsCount} of ${totalSessionsCount} microplans conducted`
              },
              { 
                label: "Villages Catchment Coverage", 
                current: assignedVillagesCount, 
                target: totalVillagesCount, 
                percent: villagesPercentage,
                description: `${assignedVillagesCount} of ${totalVillagesCount} communities registered to facilities`
              },
              { 
                label: "Approved Budget Allocation", 
                current: approvedBudgetSum, 
                target: totalBudgetSum, 
                percent: budgetPercentage,
                description: `$${approvedBudgetSum.toLocaleString()} approved of $${totalBudgetSum.toLocaleString()} allocated`
              },
            ].map((metric) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">{metric.label}</span>
                  <span className="text-muted-foreground font-mono font-bold">
                    {metric.percent}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${metric.percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{metric.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {pendingApprovals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 border border-dashed rounded-xl bg-muted/20">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
                  <p className="text-sm font-semibold text-foreground">All Tasks Fully Approved</p>
                  <p className="text-xs text-muted-foreground max-w-[220px]">There are no pending microplans or budget items awaiting review.</p>
                </div>
              ) : (
                pendingApprovals.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border hover:bg-muted/65 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold capitalize text-foreground">
                        {item.entityType.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-primary" />
                        Submitted {new Date(item.submittedAt || "").toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs font-semibold px-2 py-0.5">
                      {item.currentLevel} Level
                    </Badge>
                  </div>
                ))
              )}
              <Button
                variant="outline"
                className="w-full text-xs font-bold gap-1 mt-2 rounded-xl"
                asChild
                data-testid="button-view-approvals"
              >
                <Link href="/approvals">
                  View All Approvals
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
