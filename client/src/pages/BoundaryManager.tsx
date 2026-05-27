/**
 * Boundary Manager — Admin page for national_admin users
 *
 * Allows loading admin boundary GeoJSON for any country at any admin level:
 * - One-click fetch from GeoBoundaries API (covers 200+ countries, no download needed)
 * - Manual GeoJSON upload for GADM / OCHA HDX / custom shapefiles
 * - Configurable admin levels per country (1-5 levels)
 * - Active boundary list with level, source, feature count, and refresh
 *
 * Route: /admin/boundaries
 */

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Globe, Layers, Download, Upload, RefreshCw, Trash2,
  AlertCircle, CheckCircle, MapPin, Info, ExternalLink, Database,
} from "lucide-react";

interface SupportedCountry {
  code: string;
  name: string;
  region: string;
  maxLevel: number;
  levelNames: Record<number, string>;
}

interface BoundaryMeta {
  id: string;
  adminLevel: number;
  levelName: string;
  source: string;
  countryCode: string;
  featureCount: number | null;
  isActive: boolean;
  fetchedAt: string | null;
  createdAt: string | null;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  geoboundaries: { label: "GeoBoundaries API", color: "bg-blue-500/10 text-blue-600" },
  gadm: { label: "GADM", color: "bg-purple-500/10 text-purple-600" },
  ocha_hdx: { label: "OCHA HDX", color: "bg-orange-500/10 text-orange-600" },
  natural_earth: { label: "Natural Earth", color: "bg-emerald-500/10 text-emerald-600" },
  custom: { label: "Custom Upload", color: "bg-gray-500/10 text-gray-600" },
};

function BoundaryRow({ boundary, onDelete }: { boundary: BoundaryMeta; onDelete: (id: string) => void }) {
  const src = SOURCE_LABELS[boundary.source] ?? SOURCE_LABELS.custom;
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0 group">
      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-primary">L{boundary.adminLevel}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{boundary.levelName}</span>
          <Badge variant="secondary" className="font-mono text-xs">{boundary.countryCode}</Badge>
          <Badge variant="secondary" className={`text-xs ${src.color}`}>{src.label}</Badge>
          {boundary.isActive && (
            <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">Active</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {boundary.featureCount?.toLocaleString() ?? "?"} features
          </span>
          {boundary.fetchedAt && (
            <span className="text-xs text-muted-foreground">
              Fetched {new Date(boundary.fetchedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
        onClick={() => onDelete(boundary.id)}
        data-testid={`button-delete-boundary-${boundary.id}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function BoundaryManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch dialog state
  const [fetchOpen, setFetchOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [levelName, setLevelName] = useState("");

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCountryCode, setUploadCountryCode] = useState("");
  const [uploadLevel, setUploadLevel] = useState("1");
  const [uploadLevelName, setUploadLevelName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /*
  // Original queries (commented out to preserve working code while adding offline capabilities):
  const { data: countries, isLoading: loadingCountries } = useQuery<SupportedCountry[]>({
    queryKey: ["/api/boundaries/countries"],
  });

  const { data: boundaries, isLoading: loadingBoundaries } = useQuery<BoundaryMeta[]>({
    queryKey: ["/api/boundaries"],
  });
  */

  // Updated queries with offline fallbacks:
  const { data: countries, isLoading: loadingCountries } = useQuery<SupportedCountry[]>({
    queryKey: ["/api/boundaries/countries"],
    queryFn: async () => {
      if (!navigator.onLine) return [];
      const res = await fetch("/api/boundaries/countries");
      if (!res.ok) throw new Error("Failed to fetch supported countries");
      return res.json();
    }
  });

  const { data: boundaries, isLoading: loadingBoundaries } = useQuery<BoundaryMeta[]>({
    queryKey: ["/api/boundaries"],
    queryFn: async () => {
      if (!navigator.onLine) return [];
      const res = await fetch("/api/boundaries");
      if (!res.ok) throw new Error("Failed to fetch boundaries");
      return res.json();
    }
  });

  const fetchMutation = useMutation({
    mutationFn: async (payload: { countryCode: string; adminLevel: number; levelName: string }) =>
      apiRequest("POST", "/api/boundaries/fetch", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/boundaries"] });
      setFetchOpen(false);
      toast({ title: "Boundary loaded successfully", description: `${selectedCountry?.name} Level ${selectedLevel} admin boundaries are now available on the map.` });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to load boundary", description: err.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload: object) => apiRequest("POST", "/api/boundaries/upload", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/boundaries"] });
      setUploadOpen(false);
      setUploadFile(null);
      toast({ title: "GeoJSON uploaded successfully", description: "Admin boundaries are now available on the map." });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/boundaries/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/boundaries"] });
      setDeleteId(null);
      toast({ title: "Boundary removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  // When country is selected, auto-fill the default level name
  const handleCountrySelect = (code: string) => {
    const country = countries?.find((c) => c.code === code) ?? null;
    setSelectedCountry(country);
    if (country) {
      setSelectedLevel(1);
      setLevelName(country.levelNames[1] ?? "Region");
    }
  };

  const handleLevelSelect = (level: number) => {
    setSelectedLevel(level);
    if (selectedCountry) {
      setLevelName(selectedCountry.levelNames[level] ?? `Level ${level}`);
    }
  };

  const handleFetch = () => {
    if (!selectedCountry || !levelName) return;
    fetchMutation.mutate({
      countryCode: selectedCountry.code,
      adminLevel: selectedLevel,
      levelName: levelName.trim(),
    });
  };

  const handleFileRead = async () => {
    if (!uploadFile) return;
    try {
      const text = await uploadFile.text();
      const geojson = JSON.parse(text);
      uploadMutation.mutate({
        countryCode: uploadCountryCode.trim().toUpperCase(),
        adminLevel: parseInt(uploadLevel),
        levelName: uploadLevelName.trim(),
        geojson,
      });
    } catch {
      toast({ title: "Invalid GeoJSON", description: "The file could not be parsed as GeoJSON.", variant: "destructive" });
    }
  };

  const regions = Array.from(new Set((countries ?? []).map((c) => c.region))).sort();
  const grouped = regions.map((region) => ({
    region,
    countries: (countries ?? []).filter((c) => c.region === region).sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Admin Boundary Manager
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Load GIS administrative boundaries for any country. Boundaries render as interactive polygons on the map.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadOpen(true)} className="gap-2" data-testid="button-upload-boundary">
            <Upload className="h-4 w-4" /> Upload GeoJSON
          </Button>
          <Button onClick={() => setFetchOpen(true)} className="gap-2" data-testid="button-fetch-boundary">
            <Globe className="h-4 w-4" /> Fetch from GeoBoundaries
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="text-sm font-medium">How to get admin boundaries</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                {
                  name: "GeoBoundaries API",
                  desc: "Best option. One-click fetch for 200+ countries. No download needed.",
                  url: "https://geoboundaries.org",
                  badge: "Recommended",
                  badgeColor: "bg-emerald-500/10 text-emerald-700",
                },
                {
                  name: "GADM (Manual)",
                  desc: "Highest detail. Download .shp → convert to GeoJSON via Mapshaper.org → upload.",
                  url: "https://gadm.org/download_country.html",
                  badge: "Manual",
                  badgeColor: "bg-amber-500/10 text-amber-700",
                },
                {
                  name: "OCHA HDX",
                  desc: "Humanitarian-grade Africa-focused boundaries. Includes South Sudan, Somalia, etc.",
                  url: "https://data.humdata.org",
                  badge: "Africa",
                  badgeColor: "bg-blue-500/10 text-blue-700",
                },
              ].map((src) => (
                <a
                  key={src.name}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-background/60 border border-border/40 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{src.name}</span>
                    <Badge variant="secondary" className={`text-[10px] ${src.badgeColor}`}>{src.badge}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{src.desc}</p>
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-primary">
                    <ExternalLink className="h-2.5 w-2.5" /> Open
                  </div>
                </a>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Boundaries */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Loaded Boundary Datasets
                {!loadingBoundaries && (
                  <Badge variant="secondary" className="text-xs">{boundaries?.length ?? 0}</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                All boundaries render as interactive polygon overlays on the map view.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ["/api/boundaries"] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBoundaries ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !boundaries || boundaries.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No boundaries loaded yet.</p>
              <p className="text-xs mt-1">Fetch from GeoBoundaries API or upload a GeoJSON file.</p>
            </div>
          ) : (
            <div>
              {boundaries.map((b) => (
                <BoundaryRow key={b.id} boundary={b} onDelete={setDeleteId} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Fetch from GeoBoundaries Dialog ──────────────────────────────── */}
      <Dialog open={fetchOpen} onOpenChange={setFetchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Fetch from GeoBoundaries API
            </DialogTitle>
            <DialogDescription>
              Select a country and admin level. GeoJSON is fetched automatically — no download or conversion needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Select onValueChange={handleCountrySelect}>
                <SelectTrigger data-testid="select-country">
                  <SelectValue placeholder="Select country…" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {grouped.map(({ region, countries: regionCountries }) => (
                    <SelectGroup key={region}>
                      <SelectLabel className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40">
                        {region}
                      </SelectLabel>
                      {regionCountries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} <span className="text-muted-foreground ml-1 text-xs font-mono">({c.code})</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCountry && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Admin Level</Label>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: selectedCountry.maxLevel + 1 }, (_, i) => i).map((lvl) => (
                      <Button
                        key={lvl}
                        size="sm"
                        variant={selectedLevel === lvl ? "default" : "outline"}
                        className="h-8 text-xs"
                        onClick={() => handleLevelSelect(lvl)}
                        data-testid={`button-level-${lvl}`}
                      >
                        L{lvl} — {selectedCountry.levelNames[lvl] ?? `Level ${lvl}`}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="level-name" className="text-xs">Level Label (editable)</Label>
                  <Input
                    id="level-name"
                    value={levelName}
                    onChange={(e) => setLevelName(e.target.value)}
                    placeholder="e.g. District"
                    data-testid="input-level-name"
                  />
                </div>

                <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Fetching large countries (Nigeria, DRC, Ethiopia) may take 30–60 seconds.
                    The page will not freeze — data loads in the background.
                  </span>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFetchOpen(false)}>Cancel</Button>
            <Button
              onClick={handleFetch}
              disabled={!selectedCountry || !levelName || fetchMutation.isPending}
              className="gap-2"
              data-testid="button-confirm-fetch"
            >
              {fetchMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Fetching…</>
              ) : (
                <><Download className="h-4 w-4" /> Fetch Boundaries</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Upload GeoJSON Dialog ─────────────────────────────────────────── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Custom GeoJSON
            </DialogTitle>
            <DialogDescription>
              Upload a GeoJSON FeatureCollection. Convert GADM shapefiles using{" "}
              <a href="https://mapshaper.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Mapshaper.org
              </a>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="up-code" className="text-xs">ISO Country Code</Label>
                <Input
                  id="up-code"
                  value={uploadCountryCode}
                  onChange={(e) => setUploadCountryCode(e.target.value.toUpperCase())}
                  placeholder="e.g. KEN"
                  maxLength={3}
                  className="font-mono"
                  data-testid="input-upload-country-code"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="up-level" className="text-xs">Admin Level</Label>
                <Select value={uploadLevel} onValueChange={setUploadLevel}>
                  <SelectTrigger id="up-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5].map((l) => (
                      <SelectItem key={l} value={String(l)}>Level {l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="up-level-name" className="text-xs">Level Label</Label>
              <Input
                id="up-level-name"
                value={uploadLevelName}
                onChange={(e) => setUploadLevelName(e.target.value)}
                placeholder="e.g. District"
                data-testid="input-upload-level-name"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">GeoJSON File (.geojson or .json)</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium">{uploadFile.name}</span>
                    <span className="text-muted-foreground">({(uploadFile.size / 1024).toFixed(0)} KB)</span>
                  </div>
                ) : (
                  <div>
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm text-muted-foreground">Drop a GeoJSON file or click to browse</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".geojson,.json"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                data-testid="input-geojson-file"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button
              onClick={handleFileRead}
              disabled={!uploadFile || !uploadCountryCode || !uploadLevelName || uploadMutation.isPending}
              className="gap-2"
              data-testid="button-confirm-upload"
            >
              {uploadMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="h-4 w-4" /> Upload & Store</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove boundary dataset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the stored GeoJSON for this admin level. The boundary will disappear from the map.
              You can re-fetch it at any time from GeoBoundaries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
