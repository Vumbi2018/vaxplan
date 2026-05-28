import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Province, District, Facility } from "@shared/schema";

export interface FacilityCascadePickerProps {
  value: number | null | undefined;
  onChange: (facilityId: number | null, facility: Facility | null) => void;
  disabled?: boolean;
  required?: boolean;
  showLabels?: boolean;
  layout?: "row" | "stacked";
  provinceLabel?: string;
  districtLabel?: string;
  facilityLabel?: string;
  testIdPrefix?: string;
  className?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

/**
 * Searchable cascading Province → District → Facility picker.
 *
 * - Controlled by `value` (facilityId). Parent owns the selected facility id.
 * - When `value` is set externally, the picker auto-derives the matching
 *   province and district so the cascade shows the correct context.
 * - All three fields are searchable (cmdk combobox).
 * - Cascading: changing a parent clears the child selection.
 */
export function FacilityCascadePicker({
  value,
  onChange,
  disabled = false,
  required = false,
  showLabels = true,
  layout = "row",
  provinceLabel = "Province",
  districtLabel = "District",
  facilityLabel = "Facility",
  testIdPrefix = "facility-picker",
  className,
}: FacilityCascadePickerProps) {
  const { data: tenantInfo } = useQuery<any>({
    queryKey: ["/api/me/tenant"],
  });

  const { data: provinces } = useQuery<Province[]>({
    queryKey: ["/api/provinces", tenantInfo?.id],
    queryFn: () => fetchJson<Province[]>("/api/provinces"),
    enabled: !!tenantInfo?.id,
  });
  const { data: districts } = useQuery<District[]>({
    queryKey: ["/api/districts", tenantInfo?.id],
    queryFn: () => fetchJson<District[]>("/api/districts"),
    enabled: !!tenantInfo?.id,
  });
  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities", tenantInfo?.id],
    queryFn: () => fetchJson<Facility[]>("/api/facilities"),
    enabled: !!tenantInfo?.id,
  });

  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [provOpen, setProvOpen] = useState(false);
  const [distOpen, setDistOpen] = useState(false);
  const [facOpen, setFacOpen] = useState(false);

  // Derive province/district from the controlled facility value, so when
  // a parent passes in a facilityId we still show the correct cascade.
  useEffect(() => {
    if (!value || !facilities || !districts) return;
    const fac = facilities.find((f) => Number(f.id) === Number(value));
    if (!fac) return;
    const dist = districts.find(
      (d) => Number(d.id) === Number((fac as any).districtId),
    );
    if (dist) {
      setDistrictId(Number(dist.id));
      setProvinceId(Number((dist as any).provinceId));
    }
  }, [value, facilities, districts]);

  const sortedProvinces = useMemo(
    () =>
      [...(provinces ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [provinces],
  );
  const filteredDistricts = useMemo(() => {
    const list = provinceId
      ? (districts ?? []).filter(
          (d) => Number((d as any).provinceId) === Number(provinceId),
        )
      : districts ?? [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [districts, provinceId]);
  const filteredFacilities = useMemo(() => {
    const list = districtId
      ? (facilities ?? []).filter(
          (f) => Number((f as any).districtId) === Number(districtId),
        )
      : provinceId
      ? (facilities ?? []).filter((f) => {
          const d = (districts ?? []).find(
            (dd) => Number(dd.id) === Number((f as any).districtId),
          );
          return d && Number((d as any).provinceId) === Number(provinceId);
        })
      : facilities ?? [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [facilities, districts, provinceId, districtId]);

  const selectedProvince = sortedProvinces.find(
    (p) => Number(p.id) === Number(provinceId),
  );
  const selectedDistrict = filteredDistricts.find(
    (d) => Number(d.id) === Number(districtId),
  );
  const selectedFacility = (facilities ?? []).find(
    (f) => Number(f.id) === Number(value ?? -1),
  );

  const containerClass =
    layout === "row"
      ? "grid grid-cols-1 md:grid-cols-3 gap-3"
      : "flex flex-col gap-3";

  return (
    <div className={cn(containerClass, className)}>
      {/* Province */}
      <div className="space-y-1">
        {showLabels && (
          <Label className="text-xs">{provinceLabel}</Label>
        )}
        <Popover open={provOpen} onOpenChange={setProvOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              disabled={disabled || sortedProvinces.length === 0}
              className="w-full justify-between font-normal"
              data-testid={`${testIdPrefix}-province`}
            >
              <span className="truncate text-left">
                {selectedProvince
                  ? selectedProvince.name
                  : sortedProvinces.length
                  ? `Pick a ${provinceLabel.toLowerCase()}`
                  : `No ${provinceLabel.toLowerCase()}s available`}
              </span>
              <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-[--radix-popover-trigger-width]"
            align="start"
          >
            <Command>
              <CommandInput
                placeholder={`Search ${provinceLabel.toLowerCase()}...`}
              />
              <CommandList>
                <CommandEmpty>No matches.</CommandEmpty>
                <CommandGroup>
                  {sortedProvinces.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={p.name}
                      onSelect={() => {
                        const newId = Number(p.id);
                        setProvinceId(newId);
                        setDistrictId(null);
                        onChange(null, null);
                        setProvOpen(false);
                      }}
                      data-testid={`${testIdPrefix}-province-option-${p.id}`}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          Number(provinceId) === Number(p.id)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {p.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* District */}
      <div className="space-y-1">
        {showLabels && (
          <Label className="text-xs">{districtLabel}</Label>
        )}
        <Popover open={distOpen} onOpenChange={setDistOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              disabled={disabled || !provinceId || filteredDistricts.length === 0}
              className="w-full justify-between font-normal"
              data-testid={`${testIdPrefix}-district`}
            >
              <span className="truncate text-left">
                {selectedDistrict
                  ? selectedDistrict.name
                  : !provinceId
                  ? `Pick a ${provinceLabel.toLowerCase()} first`
                  : filteredDistricts.length
                  ? `Pick a ${districtLabel.toLowerCase()}`
                  : `No ${districtLabel.toLowerCase()}s in this ${provinceLabel.toLowerCase()}`}
              </span>
              <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-[--radix-popover-trigger-width]"
            align="start"
          >
            <Command>
              <CommandInput
                placeholder={`Search ${districtLabel.toLowerCase()}...`}
              />
              <CommandList>
                <CommandEmpty>No matches.</CommandEmpty>
                <CommandGroup>
                  {filteredDistricts.map((d) => (
                    <CommandItem
                      key={d.id}
                      value={d.name}
                      onSelect={() => {
                        setDistrictId(Number(d.id));
                        onChange(null, null);
                        setDistOpen(false);
                      }}
                      data-testid={`${testIdPrefix}-district-option-${d.id}`}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          Number(districtId) === Number(d.id)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {d.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Facility */}
      <div className="space-y-1">
        {showLabels && (
          <Label className="text-xs">
            {facilityLabel}
            {required ? " *" : ""}
          </Label>
        )}
        <Popover open={facOpen} onOpenChange={setFacOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              disabled={
                disabled || !districtId || filteredFacilities.length === 0
              }
              className="w-full justify-between font-normal"
              data-testid={`${testIdPrefix}-facility`}
            >
              <span className="truncate text-left">
                {selectedFacility
                  ? selectedFacility.name
                  : !districtId
                  ? `Pick a ${districtLabel.toLowerCase()} first`
                  : filteredFacilities.length
                  ? `Pick a ${facilityLabel.toLowerCase()}`
                  : `No ${facilityLabel.toLowerCase()}s in this ${districtLabel.toLowerCase()}`}
              </span>
              <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-[--radix-popover-trigger-width]"
            align="start"
          >
            <Command>
              <CommandInput
                placeholder={`Search ${facilityLabel.toLowerCase()}...`}
              />
              <CommandList>
                <CommandEmpty>No matches.</CommandEmpty>
                <CommandGroup>
                  {filteredFacilities.map((f) => (
                    <CommandItem
                      key={f.id}
                      value={f.name}
                      onSelect={() => {
                        onChange(Number(f.id), f);
                        setFacOpen(false);
                      }}
                      data-testid={`${testIdPrefix}-facility-option-${f.id}`}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          Number(value) === Number(f.id)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {f.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
