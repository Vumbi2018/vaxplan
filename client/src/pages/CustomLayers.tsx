/**
 * Custom Layers — Admin page for national_admin / gis_specialist users
 *
 * Upload custom map layers (roads, travel-time, schools, water, terrain, etc.)
 * in GeoJSON/JSON, Shapefile (.zip), CSV points, or GeoTIFF. Layers render as
 * toggleable overlays on the map and can be tagged for use in planning.
 *
 * Route: /admin/custom-layers
 */

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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
import { useAuth } from "@/hooks/useAuth";
import {
  Layers, Upload, Trash2, Info, CheckCircle, Map as MapIcon,
  Image as ImageIcon, RefreshCw,
} from "lucide-react";

interface CustomLayerMeta {
  id: string;
  name: string;
  description: string | null;
  category: string;
  layerType: "vector" | "raster";
  format: "geojson" | "shapefile" | "csv" | "geotiff";
  featureCount: number | null;
  fileSizeBytes: number | null;
  usableInPlanning: boolean;
  isActive: boolean;
  style: any;
  createdAt: string | null;
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: "road_network", label: "Road Network" },
  { value: "travel_time", label: "Travel Time" },
  { value: "schools", label: "Schools" },
  { value: "health_features", label: "Health Features" },
  { value: "water", label: "Water Bodies" },
  { value: "terrain", label: "Terrain" },
  { value: "settlement", label: "Settlements" },
  { value: "other", label: "Other" },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LayerRow({
  layer, onDelete, onToggleActive, onTogglePlanning, busy,
}: {
  layer: CustomLayerMeta;
  onDelete: (id: string) => void;
  onToggleActive: (layer: CustomLayerMeta) => void;
  onTogglePlanning: (layer: CustomLayerMeta) => void;
  busy: boolean;
}) {
  const color = layer.style?.color ?? "#2563eb";
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0 group">
      <div
        className="h-8 w-8 rounded flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}22` }}
      >
        {layer.layerType === "raster"
          ? <ImageIcon className="h-4 w-4" style={{ color }} />
          : <MapIcon className="h-4 w-4" style={{ color }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{layer.name}</span>
          <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[layer.category] ?? layer.category}</Badge>
          <Badge variant="secondary" className="text-xs uppercase">{layer.format}</Badge>
          {layer.usableInPlanning && (
            <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">Planning</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {layer.layerType === "raster"
              ? `Raster · ${formatBytes(layer.fileSizeBytes)}`
              : `${(layer.featureCount ?? 0).toLocaleString()} features`}
          </span>
          {layer.description && (
            <span className="text-xs text-muted-foreground truncate max-w-[240px]">{layer.description}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <Switch
            checked={layer.isActive}
            onCheckedChange={() => onToggleActive(layer)}
            disabled={busy}
            data-testid={`switch-active-${layer.id}`}
          />
          <span className="text-xs text-muted-foreground w-12">{layer.isActive ? "Shown" : "Hidden"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={layer.usableInPlanning}
            onCheckedChange={() => onTogglePlanning(layer)}
            disabled={busy}
            data-testid={`switch-planning-${layer.id}`}
          />
          <span className="text-xs text-muted-foreground w-14">Planning</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
          onClick={() => onDelete(layer.id)}
          data-testid={`button-delete-layer-${layer.id}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function CustomLayers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("road_network");
  const [usableInPlanning, setUsableInPlanning] = useState(false);
  const [color, setColor] = useState("#2563eb");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const admin = user?.role === "national_admin";

  const { data: layers, isLoading } = useQuery<CustomLayerMeta[]>({
    queryKey: ["/api/custom-layers"],
    queryFn: async () => {
      if (!navigator.onLine) return [];
      const res = await fetch("/api/custom-layers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch custom layers");
      return res.json();
    },
  });

  const resetForm = () => {
    setName(""); setDescription(""); setCategory("road_network");
    setUsableInPlanning(false); setColor("#2563eb"); setFile(null);
  };

  const handleUpload = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Give this layer a name.", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "File required", description: "Choose a file to upload.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name.trim());
      if (description.trim()) fd.append("description", description.trim());
      fd.append("category", category);
      fd.append("usableInPlanning", usableInPlanning ? "true" : "false");
      fd.append("color", color);
      const res = await fetch("/api/custom-layers", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      qc.invalidateQueries({ queryKey: ["/api/custom-layers"] });
      setUploadOpen(false);
      resetForm();
      toast({ title: "Layer uploaded", description: "It now appears as a toggleable overlay on the map." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const patchMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: object }) =>
      apiRequest("PATCH", `/api/custom-layers/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/custom-layers"] }),
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/custom-layers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/custom-layers"] });
      setDeleteId(null);
      toast({ title: "Layer removed" });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  if (!admin) {
    return (
      <div className="p-6 max-w-3xl">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Layers className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Custom layer management is available to national administrators only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Custom Map Layers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload your own map layers — roads, travel time, schools, water, terrain and more.
            Each layer can be shown on the map and tagged for use in planning.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-2" data-testid="button-upload-layer">
          <Upload className="h-4 w-4" /> Upload Layer
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Supported file formats</p>
            <p className="text-xs text-muted-foreground">
              <strong>GeoJSON / JSON</strong> (.geojson, .json) · <strong>Shapefile</strong> (.zip containing .shp/.dbf/.shx) ·{" "}
              <strong>CSV points</strong> (.csv with latitude & longitude columns) · <strong>GeoTIFF</strong> (.tif, .tiff)
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum file size 200 MB. Vector layers (GeoJSON, Shapefile, CSV) render as styled shapes;
              GeoTIFF renders as a raster image overlay.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Layer list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Uploaded Layers
                {!isLoading && <Badge variant="secondary" className="text-xs">{layers?.length ?? 0}</Badge>}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Toggle <strong>Shown</strong> to display a layer on the map. Toggle <strong>Planning</strong> to make it available to planning calculations.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ["/api/custom-layers"] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !layers || layers.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No custom layers yet.</p>
              <p className="text-xs mt-1">Upload a GeoJSON, Shapefile, CSV or GeoTIFF to get started.</p>
            </div>
          ) : (
            <div>
              {layers.map((l) => (
                <LayerRow
                  key={l.id}
                  layer={l}
                  busy={patchMutation.isPending}
                  onDelete={setDeleteId}
                  onToggleActive={(layer) => patchMutation.mutate({ id: layer.id, body: { isActive: !layer.isActive } })}
                  onTogglePlanning={(layer) => patchMutation.mutate({ id: layer.id, body: { usableInPlanning: !layer.usableInPlanning } })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Upload Custom Layer
            </DialogTitle>
            <DialogDescription>
              Upload a GeoJSON, Shapefile (.zip), CSV points file, or GeoTIFF.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="layer-name" className="text-xs">Layer Name</Label>
              <Input
                id="layer-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Roads, School Locations"
                data-testid="input-layer-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-layer-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="layer-color" className="text-xs">Display Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="layer-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 rounded border border-input bg-background cursor-pointer"
                    data-testid="input-layer-color"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{color}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="layer-desc" className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                id="layer-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes about this layer's source or contents"
                rows={2}
                data-testid="input-layer-description"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium">Usable in planning</Label>
                <p className="text-[11px] text-muted-foreground">Make this layer available to planning calculations.</p>
              </div>
              <Switch
                checked={usableInPlanning}
                onCheckedChange={setUsableInPlanning}
                data-testid="switch-usable-planning"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">File</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".geojson,.json,.csv,.zip,.tif,.tiff"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                data-testid="input-layer-file"
              />
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <Upload className="h-5 w-5 mx-auto mb-1 opacity-40" />
                    Click to choose a file
                    <p className="text-[11px] mt-1">.geojson · .json · .csv · .zip · .tif</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading} className="gap-2" data-testid="button-confirm-upload">
              {uploading ? (<><RefreshCw className="h-4 w-4 animate-spin" /> Uploading…</>) : (<><Upload className="h-4 w-4" /> Upload</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this layer?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the layer and its data. It will no longer appear on the map or in planning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
