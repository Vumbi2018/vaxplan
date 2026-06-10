import { CheckCircle2, XCircle, MinusCircle, Trash2, Star, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import LocationPickerMap from "@/components/LocationPickerMap";
import {
  type ChecklistAnswer as ChecklistItem,
  type ChecklistQuestionType,
} from "@shared/supervisionChecklist";

export function RespBtn({
  active,
  onClick,
  icon: Icon,
  label,
  tone,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  tone: string;
  testId: string;
}) {
  const map: Record<string, string> = {
    emerald: active
      ? "bg-emerald-500 text-white border-emerald-500"
      : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10",
    rose: active
      ? "bg-rose-500 text-white border-rose-500"
      : "border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10",
    muted: active
      ? "bg-muted-foreground text-background border-muted-foreground"
      : "border-border text-muted-foreground hover:bg-muted",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`resp-${testId}`}
      className={`h-7 px-2 rounded-md border text-xs font-medium inline-flex items-center gap-1 transition-colors ${map[tone]}`}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}

export function ChecklistQuestion({
  item,
  displayNumber,
  instanceLabel,
  onRemove,
  setResp,
  setNote,
  setValue,
  defaultCenter,
}: {
  item: ChecklistItem;
  displayNumber?: number;
  instanceLabel?: string;
  onRemove?: () => void;
  setResp: (key: string, r: ChecklistItem["response"]) => void;
  setNote: (key: string, n: string) => void;
  setValue: (key: string, v: unknown) => void;
  defaultCenter?: [number, number] | null;
}) {
  const { toast } = useToast();
  const type: ChecklistQuestionType = item.type || "yes_no";
  const key = item.key;

  const onImage = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Please use a photo under 5 MB.",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setValue(key, { dataUrl: reader.result as string, name: file.name });
    reader.readAsDataURL(file);
  };

  const gps = (item.value as any) || null;
  const img = (item.value as any) || null;
  const multi: string[] = Array.isArray(item.value) ? (item.value as string[]) : [];

  return (
    <div
      className={`border rounded-lg p-3 space-y-2 ${
        item.parentId ? "ml-4 border-l-2 border-l-indigo-400/60 bg-muted/30" : ""
      }`}
      data-testid={`check-${item.key}`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="text-sm font-medium flex-1 min-w-[200px]">
          {instanceLabel ? (
            <span className="text-muted-foreground">{instanceLabel}: </span>
          ) : displayNumber != null ? (
            `${displayNumber}. `
          ) : (
            ""
          )}
          {item.label}
          {item.required && <span className="text-rose-500 ml-1">*</span>}
          {item.helpText && (
            <p className="text-xs text-muted-foreground font-normal mt-0.5">{item.helpText}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {(type === "yes_no" || type === "true_false") && (
            <div className="flex gap-1">
              <RespBtn
                active={item.response === "yes"}
                onClick={() => setResp(key, "yes")}
                icon={CheckCircle2}
                label={type === "true_false" ? "True" : "Yes"}
                tone="emerald"
                testId={`${item.key}-yes`}
              />
              <RespBtn
                active={item.response === "no"}
                onClick={() => setResp(key, "no")}
                icon={XCircle}
                label={type === "true_false" ? "False" : "No"}
                tone="rose"
                testId={`${item.key}-no`}
              />
              <RespBtn
                active={item.response === "na"}
                onClick={() => setResp(key, "na")}
                icon={MinusCircle}
                label="N/A"
                tone="muted"
                testId={`${item.key}-na`}
              />
            </div>
          )}
          {onRemove && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-destructive h-8 w-8"
              onClick={onRemove}
              data-testid={`${item.key}-remove`}
              title="Remove this entry"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {type === "text" && (
        <Textarea
          rows={2}
          placeholder="Type the answer"
          value={(item.value as string) || ""}
          onChange={(e) => setValue(key, e.target.value)}
          data-testid={`${item.key}-text`}
        />
      )}

      {type === "number" && (
        <Input
          type="number"
          placeholder="Enter a number"
          value={item.value === undefined || item.value === null ? "" : String(item.value)}
          onChange={(e) => setValue(key, e.target.value === "" ? null : Number(e.target.value))}
          data-testid={`${item.key}-number`}
        />
      )}

      {type === "date" && (
        <Input
          type="date"
          value={(item.value as string) || ""}
          onChange={(e) => setValue(key, e.target.value)}
          data-testid={`${item.key}-date`}
        />
      )}

      {type === "rating" && (
        <div className="flex gap-1" data-testid={`${item.key}-rating`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              type="button"
              size="icon"
              variant={Number(item.value) >= n ? "default" : "outline"}
              className="h-8 w-8"
              onClick={() => setValue(key, n)}
              data-testid={`${item.key}-rating-${n}`}
            >
              <Star className="h-4 w-4" />
            </Button>
          ))}
        </div>
      )}

      {type === "single_select" && (
        <Select value={(item.value as string) || ""} onValueChange={(v) => setValue(key, v)}>
          <SelectTrigger data-testid={`${item.key}-single`}>
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            {(item.options || []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {type === "multi_select" && (
        <div className="space-y-1" data-testid={`${item.key}-multi`}>
          {(item.options || []).map((o) => {
            const checked = multi.includes(o);
            return (
              <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...multi, o]
                      : multi.filter((x) => x !== o);
                    setValue(key, next);
                  }}
                />
                {o}
              </label>
            );
          })}
        </div>
      )}

      {type === "gps" && (
        <LocationPickerMap
          value={
            gps?.lat != null ? { lat: Number(gps.lat), lng: Number(gps.lng), accuracy: gps.accuracy } : null
          }
          defaultCenter={defaultCenter}
          onChange={(loc) =>
            setValue(key, {
              lat: loc.lat,
              lng: loc.lng,
              accuracy: loc.accuracy,
              capturedAt: new Date().toISOString(),
            })
          }
        />
      )}

      {type === "image" && (
        <div className="space-y-2">
          <label
            className="inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 cursor-pointer hover:bg-muted"
            data-testid={`${item.key}-image-label`}
          >
            <Camera className="h-4 w-4" />
            {img?.dataUrl ? "Replace photo" : "Add photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onImage(e.target.files?.[0])}
              data-testid={`${item.key}-image`}
            />
          </label>
          {img?.dataUrl && (
            <img
              src={img.dataUrl}
              alt={img.name || "captured"}
              className="max-h-40 rounded-md border"
            />
          )}
        </div>
      )}

      {(type === "yes_no" || type === "true_false") && item.response === "no" && (
        <Input
          placeholder="Note the gap (optional)"
          value={item.note || ""}
          onChange={(e) => setNote(key, e.target.value)}
          className="text-xs"
        />
      )}
    </div>
  );
}
