import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DataTable } from "@/components/DataTable";
import { GeoCascadeFilter } from "@/components/GeoCascadeFilter";
import { buildGeoMaps, withGeoColumns } from "@/lib/geoHierarchy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { offlineDb, enqueueOutbox } from "@/lib/offlineDb";
// Original Code: Standard lucide-react imports without autocomplete and check icons
/*
import {
  Plus,
  User,
  ClipboardList,
  Syringe,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Phone,
  MapPin,
  Heart,
  Baby,
  Calendar,
  Layers,
  XCircle,
  FileSpreadsheet
} from "lucide-react";
*/

// Updated Code:
// We added ChevronsUpDown and Check to the lucide-react imports to support premium, 
// search-enabled autocomplete selector for villages in the client registration form, 
// and imported Popover, Command and cn utilities to implement clean inline village seeding.
// Original Code: Standard lucide-react and UI component imports
/*
import {
  Plus,
  User,
  ClipboardList,
  Syringe,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Phone,
  MapPin,
  Heart,
  Baby,
  Calendar,
  Layers,
  XCircle,
  FileSpreadsheet,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
*/

// Updated Code:
// We import Locate for GPS coordinates capture, Switch for cross-border toggle,
// and React Leaflet components + Leaflet CSS for collapsible interactive Map Picker.
import {
  Plus,
  User,
  ClipboardList,
  Syringe,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Phone,
  MapPin,
  Heart,
  Baby,
  Calendar,
  Layers,
  XCircle,
  FileSpreadsheet,
  ChevronsUpDown,
  Check,
  Locate,
  Printer,
  Mail,
  MessageSquare,
  Send,
  Share2,
  BadgeCheck,
  Loader2,
  PenLine
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix standard Leaflet default marker icon displacement/missing asset issues and replace with offline-available premium vector SVG pins
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.prototype.options.iconUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIzNSIgdmlld0JveD0iMCAwIDI0IDM1IiBmaWxsPSJub25lIj48cGF0aCBkPSJNMTIgMEM1LjM3IDAgMCA1LjM3IDAgMTJjMCA5LjMgMTIgMjMgMTIgMjNzMTItMTMuNyAxMi0yM2MwLTYuNjMtNS4zNy0xMi0xMi0xMnoiIGZpbGw9IiMyNTYzZWIiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI0LjUiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=";
L.Icon.Default.prototype.options.iconRetinaUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIzNSIgdmlld0JveD0iMCAwIDI0IDM1IiBmaWxsPSJub25lIj48cGF0aCBkPSJNMTIgMEM1LjM3IDAgMCA1LjM3IDAgMTJjMCA5LjMgMTIgMjMgMTIgMjNzMTItMTMuNyAxMi0yM2MwLTYuNjMtNS4zNy0xMi0xMi0xMnoiIGZpbGw9IiMyNTYzZWIiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI0LjUiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=";
L.Icon.Default.prototype.options.shadowUrl = ""; // Offline flat vector shadow override
L.Icon.Default.prototype.options.iconSize = [24, 35];
L.Icon.Default.prototype.options.iconAnchor = [12, 35];
L.Icon.Default.prototype.options.popupAnchor = [0, -35];

// Premium Offline-Available Vector Pin Icon (Encoded in Base64 Data URI)
const OFFLINE_VILLAGE_ICON = typeof window !== "undefined" ? L.icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIzNSIgdmlld0JveD0iMCAwIDI0IDM1IiBmaWxsPSJub25lIj48cGF0aCBkPSJNMTIgMEM1LjM3IDAgMCA1LjM3IDAgMTJjMCA5LjMgMTIgMjMgMTIgMjNzMTItMTMuNyAxMi0yM2MwLTYuNjMtNS4zNy0xMi0xMi0xMnoiIGZpbGw9IiMxMGI5ODEiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI0LjUiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4=",
  iconSize: [24, 35],
  iconAnchor: [12, 35],
  popupAnchor: [0, -35]
}) : null as any;

// Original Code: Imports from @shared/schema without insertVillageSchema
/*
import {
  insertClientSchema,
  insertClientVaccinationSchema,
  type Client,
  type InsertClient,
  type ClientVaccination,
  type VaccineConfig,
  type Village,
  type Facility
} from "@shared/schema";
*/

// Updated Code: Include insertVillageSchema to compile the inline Add Village dialog
// Original Code: Standard client schema type validation definitions
/*
import {
  insertClientSchema,
  insertClientVaccinationSchema,
  insertVillageSchema,
  type Client,
  type InsertClient,
  type ClientVaccination,
  type VaccineConfig,
  type Village,
  type Facility
} from "@shared/schema";
import { z } from "zod";

const clientFormSchema = insertClientSchema.extend({
  name: z.string().min(2, "Client full name must be at least 2 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  parentName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  refusalReason: z.string().optional().nullable(),
  contraindications: z.array(z.string()).default([]),
});
*/

// Updated Code: Include Province and District types, extend clientFormSchema
// to support cross-border parameters and enforce villageId only if isCrossBorder is false.
import {
  insertClientSchema,
  insertClientVaccinationSchema,
  insertVillageSchema,
  type Client,
  type InsertClient,
  type ClientVaccination,
  type VaccineConfig,
  type Village,
  type Facility,
  type Province,
  type District
} from "@shared/schema";
import { z } from "zod";

// Original Code:
// const clientFormSchema = insertClientSchema.extend({
//   name: z.string().min(2, "Client full name must be at least 2 characters"),
//   dateOfBirth: z.string().min(1, "Date of birth is required"),
//   parentName: z.string().optional().nullable(),
//   contactPhone: z.string().optional().nullable(),
//   refusalReason: z.string().optional().nullable(),
//   contraindications: z.array(z.string()).default([]),
//   isCrossBorder: z.boolean().default(false),
//   countryOfOrigin: z.string().optional().nullable(),
//   foreignResidence: z.string().optional().nullable(),
//   borderPointOfEntry: z.string().optional().nullable(),
// }).refine(
//   (data) => {
//     if (data.isCrossBorder) {
//       return !!data.countryOfOrigin && data.countryOfOrigin.trim() !== "";
//     }
//     return data.villageId !== undefined && data.villageId !== null;
//   },
//   {
//     message: "A village must be selected for local residents, or country of origin specified for cross-border clients.",
//     path: ["villageId"],
//   }
// );

// Updated Code:
// Overrode tenantId and facilityId to be optional/nullable because they are required in insertClientSchema
// but are packed dynamically at submission time from the authenticated user context (not from client-side fields).
// This prevents silent client-side Zod form validation blocks when clicking "Save Client Record".
const clientFormSchema = insertClientSchema.extend({
  tenantId: z.string().optional().nullable(),
  facilityId: z.number().optional().nullable(),
  name: z.string().min(2, "Client full name must be at least 2 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  parentName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  refusalReason: z.string().optional().nullable(),
  contraindications: z.array(z.string()).default([]),
  isCrossBorder: z.boolean().default(false),
  countryOfOrigin: z.string().optional().nullable(),
  foreignResidence: z.string().optional().nullable(),
  borderPointOfEntry: z.string().optional().nullable(),
  justification: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.isCrossBorder) {
      return !!data.countryOfOrigin && data.countryOfOrigin.trim() !== "";
    }
    return data.villageId !== undefined && data.villageId !== null;
  },
  {
    message: "A village must be selected for local residents, or country of origin specified for cross-border clients.",
    path: ["villageId"],
  }
);

const VACCINE_SCHEDULE = [
  { group: "At Birth", name: "BCG", weeks: 0, code: "BCG" },
  { group: "At Birth", name: "OPV 0", weeks: 0, code: "OPV_0" },
  
  { group: "6 Weeks", name: "OPV 1", weeks: 6, code: "OPV_1" },
  { group: "6 Weeks", name: "Rotavirus 1", weeks: 6, code: "ROTA_1" },
  { group: "6 Weeks", name: "Pentavalent 1", weeks: 6, code: "PENTA_1" },
  { group: "6 Weeks", name: "PCV 1", weeks: 6, code: "PCV_1" },
  
  { group: "10 Weeks", name: "OPV 2", weeks: 10, code: "OPV_2" },
  { group: "10 Weeks", name: "Rotavirus 2", weeks: 10, code: "ROTA_2" },
  { group: "10 Weeks", name: "Pentavalent 2", weeks: 10, code: "PENTA_2" },
  { group: "10 Weeks", name: "PCV 2", weeks: 10, code: "PCV_2" },
  
  { group: "14 Weeks", name: "OPV 3", weeks: 14, code: "OPV_3" },
  { group: "14 Weeks", name: "Rotavirus 3", weeks: 14, code: "ROTA_3" },
  { group: "14 Weeks", name: "Pentavalent 3", weeks: 14, code: "PENTA_3" },
  { group: "14 Weeks", name: "PCV 3", weeks: 14, code: "PCV_3" },
  { group: "14 Weeks", name: "IPV 1", weeks: 14, code: "IPV_1" },
  
  { group: "9 Months", name: "Measles-Rubella 1", weeks: 39, code: "MR_1" },
  { group: "9 Months", name: "IPV 2", weeks: 39, code: "IPV_2" },
  
  { group: "18 Months", name: "Measles-Rubella 2", weeks: 78, code: "MR_2" }
];

const getAICatchUpPlan = (client: Client, vaccinations: ClientVaccination[]) => {
  const dob = new Date(client.dateOfBirth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (client.clientType === "pregnant_woman") {
    const parsedTt = (vaccinations || [])
      .filter((v) => v.vaccineName?.toUpperCase().includes("TT") || v.vaccineName?.toUpperCase().includes("TD"))
      .sort((a, b) => new Date(a.administeredDate).getTime() - new Date(b.administeredDate).getTime());

    const numGiven = parsedTt.length;
    const plan: Array<{
      antigen: string;
      status: "overdue" | "due_soon" | "up_to_date";
      dueDate: Date;
      advisory: string;
    }> = [];

    if (numGiven === 0) {
      plan.push({
        antigen: "Td 1 / TT 1",
        status: "overdue",
        dueDate: today,
        advisory: "Td-1 is due at first contact. Administer today to initiate maternal tetanus protection.",
      });
    } else if (numGiven === 1) {
      const lastGiven = new Date(parsedTt[0].administeredDate);
      const nextDue = new Date(lastGiven.getTime() + 4 * 7 * 24 * 3600 * 1000);
      const isOverdue = today > nextDue;
      plan.push({
        antigen: "Td 2 / TT 2",
        status: isOverdue ? "overdue" : "due_soon",
        dueDate: nextDue,
        advisory: isOverdue
          ? `Td-2 is overdue. Administer immediately (minimum 4 weeks gap from Td-1 which was given on ${lastGiven.toLocaleDateString()}).`
          : `Td-2 is scheduled for ${nextDue.toLocaleDateString()} (4 weeks after Td-1).`,
      });
    } else if (numGiven === 2) {
      const lastGiven = new Date(parsedTt[1].administeredDate);
      const nextDue = new Date(lastGiven.getTime() + 26 * 7 * 24 * 3600 * 1000);
      const isOverdue = today > nextDue;
      plan.push({
        antigen: "Td 3 / TT 3",
        status: isOverdue ? "overdue" : "due_soon",
        dueDate: nextDue,
        advisory: isOverdue
          ? `Td-3 is overdue. Administer immediately (minimum 6 months gap from Td-2 which was given on ${lastGiven.toLocaleDateString()}).`
          : `Td-3 is scheduled for ${nextDue.toLocaleDateString()} (6 months after Td-2).`,
      });
    } else if (numGiven === 3) {
      const lastGiven = new Date(parsedTt[2].administeredDate);
      const nextDue = new Date(lastGiven.getTime() + 52 * 7 * 24 * 3600 * 1000);
      const isOverdue = today > nextDue;
      plan.push({
        antigen: "Td 4 / TT 4",
        status: isOverdue ? "overdue" : "due_soon",
        dueDate: nextDue,
        advisory: isOverdue
          ? `Td-4 is overdue. Administer (minimum 1 year gap from Td-3 which was given on ${lastGiven.toLocaleDateString()}).`
          : `Td-4 is scheduled for ${nextDue.toLocaleDateString()} (1 year after Td-3).`,
      });
    } else if (numGiven === 4) {
      const lastGiven = new Date(parsedTt[3].administeredDate);
      const nextDue = new Date(lastGiven.getTime() + 52 * 7 * 24 * 3600 * 1000);
      const isOverdue = today > nextDue;
      plan.push({
        antigen: "Td 5 / TT 5",
        status: isOverdue ? "overdue" : "due_soon",
        dueDate: nextDue,
        advisory: isOverdue
          ? `Td-5 is overdue. Administer (minimum 1 year gap from Td-4 which was given on ${lastGiven.toLocaleDateString()}).`
          : `Td-5 is scheduled for ${nextDue.toLocaleDateString()} (1 year after Td-4).`,
      });
    }

    return plan;
  }

  const parsedVax = new Map<string, Date>();
  (vaccinations || []).forEach((v) => {
    if (v.vaccineName) {
      const nameNorm = v.vaccineName.toUpperCase();
      if (nameNorm.includes("BCG")) parsedVax.set("BCG", new Date(v.administeredDate));
      else if (nameNorm.includes("PENTA 1")) parsedVax.set("PENTA_1", new Date(v.administeredDate));
      else if (nameNorm.includes("PENTA 2")) parsedVax.set("PENTA_2", new Date(v.administeredDate));
      else if (nameNorm.includes("PENTA 3")) parsedVax.set("PENTA_3", new Date(v.administeredDate));
      else if (nameNorm.includes("OPV 0")) parsedVax.set("OPV_0", new Date(v.administeredDate));
      else if (nameNorm.includes("OPV 1")) parsedVax.set("OPV_1", new Date(v.administeredDate));
      else if (nameNorm.includes("OPV 2")) parsedVax.set("OPV_2", new Date(v.administeredDate));
      else if (nameNorm.includes("OPV 3")) parsedVax.set("OPV_3", new Date(v.administeredDate));
      else if (nameNorm.includes("ROTA 1")) parsedVax.set("ROTA_1", new Date(v.administeredDate));
      else if (nameNorm.includes("ROTA 2")) parsedVax.set("ROTA_2", new Date(v.administeredDate));
      else if (nameNorm.includes("ROTA 3")) parsedVax.set("ROTA_3", new Date(v.administeredDate));
      else if (nameNorm.includes("PCV 1")) parsedVax.set("PCV_1", new Date(v.administeredDate));
      else if (nameNorm.includes("PCV 2")) parsedVax.set("PCV_2", new Date(v.administeredDate));
      else if (nameNorm.includes("PCV 3")) parsedVax.set("PCV_3", new Date(v.administeredDate));
      else if (nameNorm.includes("IPV 1")) parsedVax.set("IPV_1", new Date(v.administeredDate));
      else if (nameNorm.includes("IPV 2")) parsedVax.set("IPV_2", new Date(v.administeredDate));
      else if (nameNorm.includes("MR 1")) parsedVax.set("MR_1", new Date(v.administeredDate));
      else if (nameNorm.includes("MR 2")) parsedVax.set("MR_2", new Date(v.administeredDate));
    }
  });

  const series = [
    {
      name: "Pentavalent",
      doses: [
        { code: "PENTA_1", name: "Penta 1", age: 6 },
        { code: "PENTA_2", name: "Penta 2", age: 10 },
        { code: "PENTA_3", name: "Penta 3", age: 14 }
      ]
    },
    {
      name: "Oral Polio (OPV)",
      doses: [
        { code: "OPV_0", name: "OPV 0", age: 0 },
        { code: "OPV_1", name: "OPV 1", age: 6 },
        { code: "OPV_2", name: "OPV 2", age: 10 },
        { code: "OPV_3", name: "OPV 3", age: 14 }
      ]
    },
    {
      name: "Pneumococcal (PCV)",
      doses: [
        { code: "PCV_1", name: "PCV 1", age: 6 },
        { code: "PCV_2", name: "PCV 2", age: 10 },
        { code: "PCV_3", name: "PCV 3", age: 14 }
      ]
    },
    {
      name: "Rotavirus",
      doses: [
        { code: "ROTA_1", name: "Rota 1", age: 6 },
        { code: "ROTA_2", name: "Rota 2", age: 10 },
        { code: "ROTA_3", name: "Rota 3", age: 14 }
      ]
    },
    {
      name: "Inactivated Polio (IPV)",
      doses: [
        { code: "IPV_1", name: "IPV 1", age: 14 },
        { code: "IPV_2", name: "IPV 2", age: 39 }
      ]
    },
    {
      name: "Measles-Rubella (MR)",
      doses: [
        { code: "MR_1", name: "MR 1", age: 39 },
        { code: "MR_2", name: "MR 2", age: 78 }
      ]
    },
    {
      name: "BCG",
      doses: [
        { code: "BCG", name: "BCG", age: 0 }
      ]
    }
  ];

  const plan: Array<{
    antigen: string;
    status: "overdue" | "due_soon" | "up_to_date";
    dueDate: Date;
    advisory: string;
  }> = [];

  series.forEach((s) => {
    let nextDoseIdx = s.doses.findIndex((d) => !parsedVax.has(d.code));
    if (nextDoseIdx === -1) {
      return;
    }

    const nextDose = s.doses[nextDoseIdx];
    let computedDueDate = new Date(dob.getTime() + nextDose.age * 7 * 24 * 3600 * 1000);

    if (nextDoseIdx > 0) {
      const prevDose = s.doses[nextDoseIdx - 1];
      const prevAdministeredDate = parsedVax.get(prevDose.code);
      if (prevAdministeredDate) {
        const minGapDate = new Date(prevAdministeredDate.getTime() + 4 * 7 * 24 * 3600 * 1000);
        if (minGapDate > computedDueDate) {
          computedDueDate = minGapDate;
        }
      } else {
        return;
      }
    }

    let status: "overdue" | "due_soon" | "up_to_date" = "up_to_date";
    let advisory = "";
    const weeksDiff = Math.floor((today.getTime() - computedDueDate.getTime()) / (7 * 24 * 3600 * 1000));

    if (today > computedDueDate) {
      status = "overdue";
      const overdueBy = weeksDiff === 0 ? "1 week" : `${weeksDiff + 1} weeks`;
      advisory = `${nextDose.name} is overdue by ${overdueBy}. Administer immediately today.`;
      
      if (nextDoseIdx < s.doses.length - 1) {
        const followUp = s.doses[nextDoseIdx + 1];
        const nextVisitDate = new Date(today.getTime() + 4 * 7 * 24 * 3600 * 1000);
        advisory += ` Then, schedule ${followUp.name} in exactly 4 weeks (${nextVisitDate.toLocaleDateString()}).`;
      }
    } else {
      status = "due_soon";
      advisory = `${nextDose.name} is scheduled for ${computedDueDate.toLocaleDateString()} (in ${Math.abs(weeksDiff)} weeks).`;
    }

    plan.push({
      antigen: nextDose.name,
      status,
      dueDate: computedDueDate,
      advisory,
    });
  });

  plan.sort((a, b) => {
    if (a.status === "overdue" && b.status !== "overdue") return -1;
    if (a.status !== "overdue" && b.status === "overdue") return 1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  return plan;
};

// Custom react-leaflet map control to reactively update view center
function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

// Custom react-leaflet map click events listener
function MapEvents({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}


const vaccinationFormSchema = insertClientVaccinationSchema.extend({
  tenantId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  facilityId: z.number().optional().nullable(),
  administeredDate: z.string().min(1, "Administered date is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  batchNumber: z.string().min(1, "Batch number is required"),
  vvmStatus: z.string().min(1, "VVM status is required"),
});

export default function ClientLogbook() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Tenant context for cross-tenant read-only detection. The server's
  // crossTenantWriteGuard rejects writes (e.g. POST /api/villages) with 403 when
  // the active view tenant differs from the user's home tenant. We surface that
  // in the UI so users see why "+ Add Village" is disabled instead of hitting
  // silent failures behind the open dialog overlay.
  const { data: tenantInfo } = useQuery<any>({
    queryKey: ["/api/me/tenant"],
  });
  const isCrossTenantView = !!(user?.tenantId && tenantInfo?.id && user.tenantId !== tenantInfo.id);
  const crossTenantToast = () => {
    toast({
      title: "Read-only view",
      description: `You're viewing ${tenantInfo?.name ?? "another country"} read-only. Switch back to your home country to add villages.`,
      variant: "destructive",
    });
  };

  // Active view states
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isVaccinateOpen, setIsVaccinateOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [vaccinateClient, setVaccinateClient] = useState<Client | null>(null);
  const [isVillageSelectOpen, setIsVillageSelectOpen] = useState(false);
  
  // Original Code: Standard dialog states
  /*
  const [isAddVillageOpen, setIsAddVillageOpen] = useState(false);
  */

  // Updated Code:
  // Add state hooks to drive collapsible GPS capture and interactive Mini-map coordinates picker
  const [isAddVillageOpen, setIsAddVillageOpen] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);

  // Share & Notification States
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareMethod, setShareMethod] = useState<"email" | "sms" | "whatsapp" | null>(null);
  const [shareInput, setShareInput] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isVerifiedScan, setIsVerifiedScan] = useState(false);

  // Queries
  const { data: clients, isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.clients.toArray()) as unknown as Client[];
      }
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Failed to load clients");
      return res.json();
    },
  });

  const { data: defaulterRows = [], isLoading: defaultersLoading } = useQuery<any[]>({
    queryKey: ["/api/indicators/defaulters"],
    queryFn: async () => {
      const res = await fetch("/api/indicators/defaulters", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const defaulterCount = defaulterRows.length;

  const { data: vaccineConfigs, isLoading: loadingConfigs } = useQuery<VaccineConfig[]>({
    queryKey: ["/api/vaccines/config"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.vaccineConfigs.toArray()) as unknown as VaccineConfig[];
      }
      const res = await fetch("/api/vaccines/config");
      if (!res.ok) throw new Error("Failed to load configs");
      return res.json();
    },
  });

  const { data: villages } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.villages.toArray()) as unknown as Village[];
      }
      const res = await fetch("/api/villages");
      if (!res.ok) throw new Error("Failed to load villages");
      return res.json();
    },
  });

  const { data: districts } = useQuery<District[]>({
    queryKey: ["/api/districts"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.districts.toArray()) as unknown as District[];
      }
      const res = await fetch("/api/districts");
      if (!res.ok) throw new Error("Failed to load districts");
      return res.json();
    },
  });

  const { data: provinces } = useQuery<Province[]>({
    queryKey: ["/api/provinces"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.provinces.toArray()) as unknown as Province[];
      }
      const res = await fetch("/api/provinces");
      if (!res.ok) throw new Error("Failed to load provinces");
      return res.json();
    },
  });


  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["/api/facilities"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return (await offlineDb.facilities.toArray()) as unknown as Facility[];
      }
      const res = await fetch("/api/facilities");
      if (!res.ok) throw new Error("Failed to load facilities");
      return res.json();
    },
  });

  const { data: tenant } = useQuery<any>({
    queryKey: ["/api/me/tenant"],
    queryFn: async () => {
      if (!navigator.onLine) {
        return { name: "Ministry of Health", code: "SSD", countryCode: "SSD" };
      }
      const res = await fetch("/api/me/tenant");
      if (!res.ok) throw new Error("Failed to load tenant info");
      return res.json();
    },
  });

  // QR Scan Authenticity Verification hook
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyId = params.get("verify");
    if (verifyId && clients && clients.length > 0) {
      const foundClient = clients.find((c) => c.id === verifyId);
      if (foundClient) {
        setSelectedClient(foundClient);
        setIsTimelineOpen(true);
        setIsVerifiedScan(true);
        
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        toast({
          title: "Authenticity Verified",
          description: `Successfully loaded EPI Certified digital health record for ${foundClient.name}.`,
        });
      }
    }

    // Defaulter "View" link → open timeline for that client
    const selectId = params.get("selectClient");
    if (selectId && clients && clients.length > 0) {
      const found = clients.find((c) => c.id === selectId);
      if (found) {
        setSelectedClient(found);
        setIsTimelineOpen(true);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [clients, toast]);

  useEffect(() => {
    if (!isTimelineOpen) {
      setIsVerifiedScan(false);
    }
  }, [isTimelineOpen]);

  // Client vaccinations query (only fetch for selected/vaccinate clients to be highly efficient)
  const { data: clientVaccinations, refetch: refetchVaccinations } = useQuery<ClientVaccination[]>({
    queryKey: ["/api/clients", selectedClient?.id, "vaccinations"],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      if (!navigator.onLine) {
        return (await offlineDb.clientVaccinations
          .where("clientId")
          .equals(selectedClient.id)
          .toArray()) as unknown as ClientVaccination[];
      }
      const res = await fetch(`/api/clients/${selectedClient.id}/vaccinations`);
      if (!res.ok) throw new Error("Failed to load vaccinations");
      return res.json();
    },
    enabled: !!selectedClient?.id,
  });

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      if (!navigator.onLine) {
        // Generate temporary local ID for new client
        const localId = `local-${Math.floor(Math.random() * 1000000)}`;
        const localClient = {
          ...data,
          id: localId,
          tenantId: user?.tenantId ?? "SSD",
          createdAt: Date.now() as any,
          updatedAt: Date.now() as any,
          _syncedAt: 0,
          _localOnly: true,
        };

        // Write directly to IndexedDB
        await offlineDb.clients.put(localClient as any);

        // Queue in offline sync outbox
        await enqueueOutbox({
          tenantId: user?.tenantId ?? "SSD",
          entityType: "client",
          method: "POST",
          url: "/api/clients",
          body: JSON.stringify(data),
          localId,
        });

        return localClient;
      }
      return apiRequest("POST", "/api/clients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsAddClientOpen(false);
      toast({
        title: navigator.onLine ? "Client Registered" : "Registration Queued Offline",
        description: navigator.onLine 
          ? "Demographics added to active microplanning registry."
          : "Saved locally. Registration will sync automatically once internet is restored.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Registration Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async (data: Partial<InsertClient> & { justification?: string }) => {
      if (!selectedClient?.id) return;
      if (!navigator.onLine) {
        const localClient = {
          ...selectedClient,
          ...data,
          updatedAt: Date.now() as any,
          _syncedAt: 0,
        };
        await offlineDb.clients.put(localClient as any);
        await enqueueOutbox({
          tenantId: user?.tenantId ?? "SSD",
          entityType: "client",
          method: "PATCH",
          url: `/api/clients/${selectedClient.id}`,
          body: JSON.stringify(data),
          localId: selectedClient.id,
        });
        return localClient;
      }
      return apiRequest("PATCH", `/api/clients/${selectedClient.id}`, data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      if (data) {
        setSelectedClient(data);
      }
      setIsEditClientOpen(false);
      toast({
        title: navigator.onLine ? "Profile Updated" : "Update Queued Offline",
        description: "Demographic changes successfully recorded in the registry.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const vaccinateMutation = useMutation({
    mutationFn: async ({ clientId, data }: { clientId: string; data: any }) => {
      if (!navigator.onLine) {
        const localId = -Math.floor(Math.random() * 1000000);
        const localVac = {
          ...data,
          id: localId,
          clientId,
          tenantId: user?.tenantId ?? "SSD",
          _syncedAt: 0,
          _localOnly: true,
        };

        // Write directly to IndexedDB
        await offlineDb.clientVaccinations.put(localVac as any);

        // Queue in offline sync outbox
        await enqueueOutbox({
          tenantId: user?.tenantId ?? "SSD",
          entityType: "vaccination",
          method: "POST",
          url: `/api/clients/${clientId}/vaccinate`,
          body: JSON.stringify(data),
        });

        return localVac;
      }
      return apiRequest("POST", `/api/clients/${clientId}/vaccinate`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      if (selectedClient) {
        refetchVaccinations();
      }
      setIsVaccinateOpen(false);
      setVaccinateClient(null);
      toast({
        title: navigator.onLine ? "Immunization Logged" : "Immunization Queued Offline",
        description: navigator.onLine 
          ? "Dose successfully registered with batch & VVM telemetry."
          : "Saved locally. Immunization will sync automatically once internet is restored.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Log Dose",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteVaccinationMutation = useMutation({
    mutationFn: async (vaccinationId: number) => {
      return apiRequest("DELETE", `/api/client-vaccinations/${vaccinationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      if (selectedClient) {
        refetchVaccinations();
      }
      toast({
        title: "Vaccination Reverted",
        description: "Immunization log entry successfully removed.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error Reverting",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const res = await apiRequest<any>("POST", "/api/reminders/send", { clientId });
      return res;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Reminder Dispatched",
        description: data.message || "SMS reminder successfully sent and persisted in database logs.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Send Reminder",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const sendBulkReminderMutation = useMutation({
    mutationFn: async (daysToDue: number) => {
      const res = await apiRequest<any>("POST", "/api/reminders/bulk", { daysToDue });
      return res;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Bulk Campaign Dispatched",
        description: `Successfully executed bulk campaign! Dispatched ${data.count} reminders to parents. Logs recorded.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Bulk Campaign Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Original handleShareSubmit (commented out to preserve working code):
  /*
  const handleShareSubmit = async () => {
    if (!shareInput.trim()) {
      toast({
        title: "Contact Destination Required",
        description: "Please supply a valid email or phone number.",
        variant: "destructive",
      });
      return;
    }
    setIsSharing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSharing(false);
    setIsShareOpen(false);
    setShareMethod(null);
    setShareInput("");
    toast({
      title: "Dispatch Successful",
      description: `Patient health record has been successfully transmitted via ${
        shareMethod === "email" ? "secure SMTP mail server" : shareMethod === "sms" ? "SMS cellular carrier gateway" : "WhatsApp API servers"
      }!`,
    });
  };
  */

  const handleShareSubmit = async () => {
    if (!selectedClient) return;
    if (!shareInput.trim()) {
      toast({
        title: "Contact Destination Required",
        description: "Please supply a valid email or phone number.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSharing(true);
    try {
      const res = await apiRequest<any>("POST", "/api/clients/share", {
        clientId: selectedClient.id,
        method: shareMethod,
        destination: shareInput,
      });

      setIsSharing(false);
      setIsShareOpen(false);
      setShareMethod(null);
      setShareInput("");
      
      toast({
        title: "Dispatch Successful",
        description: (
          <div className="space-y-1.5 text-xs pt-1">
            <p>
              Immunization booklet successfully transmitted to{" "}
              <strong>{shareInput}</strong> via{" "}
              <strong>{shareMethod === "email" ? "Secure Email Attachment" : shareMethod === "sms" ? "SMS Carrier Gateway (+260963328807)" : "WhatsApp API Portal (+260963328807)"}</strong>.
            </p>
            {res.attachment && (
              <div className="p-2 rounded-lg bg-secondary/80 border border-border/80 mt-1.5 space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <span>📎 Attached:</span>
                  <span className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border border-border/40 text-muted-foreground">{res.attachment.filename}</span>
                  <span className="text-[10px] text-muted-foreground">({res.attachment.size})</span>
                </p>
                <a
                  href={res.attachment.downloadUrl}
                  download
                  className="text-sky-500 hover:text-sky-600 font-extrabold underline flex items-center gap-1 mt-1 text-[11px]"
                >
                  Download Certified PDF Booklet
                </a>
              </div>
            )}
          </div>
        ),
      });
    } catch (err: any) {
      setIsSharing(false);
      toast({
        title: "Dispatch Failed",
        description: err.message || "Failed to transmit client booklet.",
        variant: "destructive",
      });
    }
  };

  // Forms
  // Original Code: Standard client form initial default values
  /*
  const clientForm = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      clientType: "child",
      dateOfBirth: "",
      gender: "male",
      parentName: "",
      contactPhone: "",
      catchmentStatus: "catchment",
      isRefusal: false,
      refusalReason: "",
      contraindications: [],
    },
  });
  */

  // Updated Code: Add defaultValues for cross-border fields to prevent form input warning alerts
  const clientForm = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      clientType: "child",
      dateOfBirth: "",
      gender: "male",
      parentName: "",
      contactPhone: "",
      catchmentStatus: "catchment",
      isRefusal: false,
      refusalReason: "",
      contraindications: [],
      isCrossBorder: false,
      countryOfOrigin: "",
      borderPointOfEntry: "",
      foreignResidence: "",
      justification: "",
    },
  });

  const editForm = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      clientType: "child",
      dateOfBirth: "",
      gender: "male",
      parentName: "",
      contactPhone: "",
      catchmentStatus: "catchment",
      isRefusal: false,
      refusalReason: "",
      contraindications: [],
      isCrossBorder: false,
      countryOfOrigin: "",
      borderPointOfEntry: "",
      foreignResidence: "",
      justification: "",
    },
  });



  // Original Code: Separating catchment villages
  /*
  const activeFacilityId = user?.facilityId || facilities?.[0]?.id || 1;
  */

  // Updated Code: Include administrative tracing helper, dynamic map centering 
  // and browser Geolocation capture helper.
  const [adminProvinceId, setAdminProvinceId] = useState<number | null>(null);
  const [adminDistrictId, setAdminDistrictId] = useState<number | null>(null);
  const [adminFacilityId, setAdminFacilityId] = useState<number | null>(null);
  // Geo cascade filter for the clients registry table
  const [geoFilterProvinceId, setGeoFilterProvinceId] = useState<number | null>(null);
  const [geoFilterDistrictId, setGeoFilterDistrictId] = useState<number | null>(null);
  const [geoFilterFacilityId, setGeoFilterFacilityId] = useState<number | null>(null);

  const activeFacilityId = user?.role === "national_admin"
    ? (adminFacilityId || 0)
    : (user?.facilityId || facilities?.[0]?.id || 1);

  // Original Code: villageFormSchema extended insertVillageSchema directly. Because insertVillageSchema requires districtId,
  // the client-side validation fails silently on submission since there's no input for districtId in the add village dialog.
  /*
  const villageFormSchema = insertVillageSchema.extend({
    name: z.string().min(2, "Village name must be at least 2 characters"),
    latitude: z.string().optional().nullable(),
    longitude: z.string().optional().nullable(),
    isHardToReach: z.boolean().default(false),
  });
  */

  // Updated Code: Explicitly override districtId to be optional/nullable in the form schema.
  // The server-side POST route automatically resolves districtId from assignedFacilityId.
  const villageFormSchema = insertVillageSchema.extend({
    name: z.string().min(2, "Village name must be at least 2 characters"),
    districtId: z.number().optional().nullable(),
    latitude: z.string().optional().nullable(),
    longitude: z.string().optional().nullable(),
    isHardToReach: z.boolean().default(false),
  });

  const villageForm = useForm<z.infer<typeof villageFormSchema>>({
    resolver: zodResolver(villageFormSchema),
    defaultValues: {
      name: "",
      isHardToReach: false,
      latitude: "",
      longitude: "",
    },
  });

  const getVillageResidencyPath = (villageId: number | null | undefined) => {
    if (!villageId) return "";
    const village = villages?.find((v) => v.id === villageId);
    if (!village) return "";
    const district = districts?.find((d) => d.id === village.districtId);
    const province = provinces?.find((p) => p.id === district?.provinceId);
    
    if (district && province) {
      return `${district.name} District, ${province.name} Province`;
    }
    if (district) {
      return `${district.name} District`;
    }
    return "";
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Unsupported",
        description: "Your browser does not support GPS location capture.",
        variant: "destructive",
      });
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        villageForm.setValue("latitude", lat);
        villageForm.setValue("longitude", lng);
        setIsGettingGps(false);
        toast({
          title: "GPS Location Acquired",
          description: `Location captured successfully: Lat: ${lat}, Lng: ${lng}`,
        });
      },
      (error) => {
        setIsGettingGps(false);
        let msg = "Failed to retrieve device location.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location access denied. Please check site permissions.";
        }
        toast({
          title: "GPS Capture Failed",
          description: msg,
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const watchLat = villageForm.watch("latitude");
  const watchLng = villageForm.watch("longitude");

  const mapCenter = useMemo<[number, number]>(() => {
    const lat = parseFloat(watchLat || "");
    const lng = parseFloat(watchLng || "");
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return [lat, lng];
    }
    // Center at facility coordinates
    const activeFac = facilities?.find((f) => f.id === Number(activeFacilityId));
    if (activeFac?.latitude && activeFac?.longitude) {
      return [parseFloat(String(activeFac.latitude)), parseFloat(String(activeFac.longitude))];
    }
    // National center default
    return [-15.4167, 28.2833];
  }, [watchLat, watchLng, facilities, activeFacilityId]);

  const handleMapClick = (lat: number, lng: number) => {
    villageForm.setValue("latitude", lat.toFixed(6));
    villageForm.setValue("longitude", lng.toFixed(6));
  };


  const { catchmentVillages, otherVillages } = useMemo(() => {
    if (!villages) return { catchmentVillages: [], otherVillages: [] };
    const activeFacId = Number(activeFacilityId);
    const catchment = villages
      .filter((v) => Number(v.assignedFacilityId) === activeFacId)
      .sort((a, b) => a.name.localeCompare(b.name));
      
    const other = villages
      .filter((v) => Number(v.assignedFacilityId) !== activeFacId)
      .sort((a, b) => a.name.localeCompare(b.name));

    return { catchmentVillages: catchment, otherVillages: other };
  }, [villages, activeFacilityId]);

  // villageFormSchema and villageForm moved up to avoid block-scope forward references

  const createVillageMutation = useMutation({
    mutationFn: async (newVillage: z.infer<typeof villageFormSchema>) => {
      const payload = {
        ...newVillage,
        latitude: newVillage.latitude && newVillage.latitude.trim() !== "" ? newVillage.latitude : null,
        longitude: newVillage.longitude && newVillage.longitude.trim() !== "" ? newVillage.longitude : null,
        assignedFacilityId: activeFacilityId,
      };
      // Original Code: Untyped apiRequest that returned a Response where .json() had to be called, causing type check issues
      /*
      const res = await apiRequest("POST", "/api/villages", payload);
      return res.json();
      */
      // Updated Code: Type-safe apiRequest call which automatically returns the parsed JSON response of type Village
      const res = await apiRequest<Village>("POST", "/api/villages", payload);
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      // Set the newly created village as the selected one
      clientForm.setValue("villageId", data.id);
      setIsAddVillageOpen(false);
      villageForm.reset();
      toast({
        title: "Village Added",
        description: `Village "${data.name}" successfully created.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Village",
        description: error.message || "Failed to create village.",
        variant: "destructive",
      });
    },
  });

  // Clear the inline Add-Village error banner as soon as the user edits the
  // form after a failed submission, so the alert doesn't stay stale.
  useEffect(() => {
    const subscription = villageForm.watch(() => {
      if (createVillageMutation.isError) {
        createVillageMutation.reset();
      }
    });
    return () => subscription.unsubscribe();
  }, [villageForm, createVillageMutation]);

  const vaccinationForm = useForm<z.infer<typeof vaccinationFormSchema>>({
    resolver: zodResolver(vaccinationFormSchema),
    defaultValues: {
      vaccineConfigId: 0,
      vaccineName: "",
      administeredDate: new Date().toISOString().split("T")[0],
      expiryDate: "",
      batchNumber: "",
      vvmStatus: "1",
    },
  });

  // Helper selectors
  const getVillageName = (villageId: number) => {
    return villages?.find((v) => v.id === villageId)?.name || `Village #${villageId}`;
  };

  const getFacilityName = (facilityId: number) => {
    return facilities?.find((f) => f.id === facilityId)?.name || `Facility #${facilityId}`;
  };

  // Dynamic Cohort Calculations
  const calculateWeeksOld = (dobString: Date | string) => {
    const dob = new Date(dobString);
    const diffTime = Date.now() - dob.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)));
  };

  // Compile full vaccination list per client
  const clientVaxMap = useMemo(() => {
    if (!clients) return new Map<string, string[]>();
    const m = new Map<string, string[]>();
    // Since we don't fetch all vaccinations for all clients in one batch,
    // the clients response includes metadata or we can calculate this.
    // However, since client logbook tracks due list, let's assume clients are loaded
    // and we fetch individual vaccinations on row click. Let's make sure the client API
    // returns vaccine names they've received if loaded, OR we can list due status
    // on a per-client selection basis or fetch overall due lists.
    // Let's check how the clients are structured in the database.
    return m;
  }, [clients]);

  // Dynamic Due Queue compile
  const dueQueue = useMemo(() => {
    if (!clients || !vaccineConfigs) return [];

    return clients.map((client) => {
      const weeksOld = client.clientType === "child" ? calculateWeeksOld(client.dateOfBirth) : 0;
      
      // Filter vaccine configurations that are due
      const dueVaccines = vaccineConfigs.filter((config) => {
        // Group matches
        const matchesType =
          client.clientType === "child"
            ? config.targetGroup === "under1" || config.targetGroup === "births"
            : config.targetGroup === "pregnant";

        if (!matchesType || !config.isActive) return false;

        // Age bounds (under1 target group requires age-weeks check)
        if (client.clientType === "child" && config.recommendedAgeWeeks > weeksOld) {
          return false;
        }

        // Check if vaccine already administered in their record
        // (For simplicity, we check if the client has a matching vaccination recorded on the backend.
        // On client model we've linked vaccinations. Let's check if the client object from server
        // already has nested vaccinations. The GET /api/clients returns the client array. Let's check
        // if they have nested 'vaccinations' property. If they do, use it; otherwise fallback).
        const alreadyReceived = ((client as any).vaccinations || []).some(
          (v: any) => v.vaccineConfigId === config.id || v.vaccineName === config.name
        );

        return !alreadyReceived;
      });

      return {
        client,
        weeksOld,
        dueVaccines,
      };
    }).filter((item) => item.dueVaccines.length > 0);
  }, [clients, vaccineConfigs]);

  // Original Code: Submit demographic register payload to POST endpoint
  /*
  const onRegisterClientSubmit = (values: z.infer<typeof clientFormSchema>) => {
    const payload: InsertClient = {
      tenantId: user?.tenantId || "",
      facilityId: user?.facilityId || facilities?.[0]?.id || 1,
      villageId: parseInt(clientForm.getValues("villageId") as any) || villages?.[0]?.id || 1,
      name: values.name,
      clientType: values.clientType as "child" | "pregnant_woman",
      dateOfBirth: new Date(values.dateOfBirth),
      gender: values.clientType === "child" ? values.gender || null : null,
      parentName: values.clientType === "child" ? values.parentName || null : null,
      contactPhone: values.contactPhone || null,
      catchmentStatus: values.catchmentStatus as "catchment" | "non-catchment",
      isRefusal: values.isRefusal,
      refusalReason: values.isRefusal ? values.refusalReason || null : null,
      contraindications: values.contraindications || [],
    };
    createClientMutation.mutate(payload);
  };
  */

  // Updated Code:
  // Dynamically pack the cross-border metadata if enabled, and skip setting a local villageId
  // (leaving the backend API to seed and map to the virtual 'Cross-Border / Foreign Residence' village).
  const onRegisterClientSubmit = (values: z.infer<typeof clientFormSchema>) => {
    if (user?.role === "national_admin") {
      if (!values.justification || values.justification.trim() === "") {
        clientForm.setError("justification", {
          type: "manual",
          message: "Justification is required for administrators to register clients.",
        });
        toast({
          title: "Justification Required",
          description: "Please specify an override justification for this administrative action.",
          variant: "destructive",
        });
        return;
      }
      if (!values.isCrossBorder && !adminFacilityId) {
        toast({
          title: "Facility Selection Required",
          description: "Please select Province, District, and Facility for the local resident.",
          variant: "destructive",
        });
        return;
      }
    }

    const payload: InsertClient = {
      tenantId: user?.tenantId || "",
      facilityId: user?.role === "national_admin"
        ? (values.isCrossBorder ? (facilities?.[0]?.id || 1) : (adminFacilityId || 1))
        : (user?.facilityId || facilities?.[0]?.id || 1),
      villageId: values.isCrossBorder ? null : (parseInt(values.villageId as any) || null),
      name: values.name,
      clientType: values.clientType as "child" | "pregnant_woman",
      dateOfBirth: new Date(values.dateOfBirth),
      gender: values.clientType === "child" ? values.gender || null : null,
      parentName: values.clientType === "child" ? values.parentName || null : null,
      contactPhone: values.contactPhone || null,
      catchmentStatus: values.isCrossBorder ? "non-catchment" : (values.catchmentStatus as "catchment" | "non-catchment"),
      isRefusal: values.isRefusal,
      refusalReason: values.isRefusal ? values.refusalReason || null : null,
      contraindications: values.contraindications || [],
      isCrossBorder: values.isCrossBorder,
      countryOfOrigin: values.isCrossBorder ? values.countryOfOrigin || null : null,
      foreignResidence: values.isCrossBorder ? values.foreignResidence || null : null,
      borderPointOfEntry: values.isCrossBorder ? values.borderPointOfEntry || null : null,
      justification: user?.role === "national_admin" ? values.justification : null,
    } as any;
    createClientMutation.mutate(payload);
  };

  const onEditClientSubmit = (values: z.infer<typeof clientFormSchema>) => {
    if (!selectedClient) return;

    if (user?.role === "national_admin") {
      if (!values.justification || values.justification.trim() === "") {
        editForm.setError("justification", {
          type: "manual",
          message: "Justification is required for administrators to edit clients.",
        });
        toast({
          title: "Justification Required",
          description: "Please specify an override justification for this administrative action.",
          variant: "destructive",
        });
        return;
      }
    }

    const payload = {
      facilityId: user?.role === "national_admin"
        ? (values.isCrossBorder ? (facilities?.[0]?.id || 1) : (adminFacilityId || selectedClient.facilityId))
        : (user?.facilityId || selectedClient.facilityId),
      villageId: values.isCrossBorder ? null : (parseInt(values.villageId as any) || null),
      name: values.name,
      clientType: values.clientType as "child" | "pregnant_woman",
      dateOfBirth: new Date(values.dateOfBirth),
      gender: values.clientType === "child" ? values.gender || null : null,
      parentName: values.clientType === "child" ? values.parentName || null : null,
      contactPhone: values.contactPhone || null,
      catchmentStatus: values.isCrossBorder ? "non-catchment" : (values.catchmentStatus as "catchment" | "non-catchment"),
      isRefusal: values.isRefusal,
      refusalReason: values.isRefusal ? values.refusalReason || null : null,
      contraindications: values.contraindications || [],
      isCrossBorder: values.isCrossBorder,
      countryOfOrigin: values.isCrossBorder ? values.countryOfOrigin || null : null,
      foreignResidence: values.isCrossBorder ? values.foreignResidence || null : null,
      borderPointOfEntry: values.isCrossBorder ? values.borderPointOfEntry || null : null,
      justification: user?.role === "national_admin" ? values.justification : null,
    };

    updateClientMutation.mutate(payload as any);
  };


  const onVaccinateSubmit = (values: z.infer<typeof vaccinationFormSchema>) => {
    if (!vaccinateClient) return;
    const configId = parseInt(values.vaccineConfigId as any);
    const selectedConfig = vaccineConfigs?.find((c) => c.id === configId);
    
    const payload = {
      tenantId: user?.tenantId || "",
      vaccineConfigId: configId,
      vaccineName: selectedConfig?.name || values.vaccineName,
      administeredDate: new Date(values.administeredDate),
      expiryDate: new Date(values.expiryDate),
      batchNumber: values.batchNumber,
      vvmStatus: parseInt(values.vvmStatus),
    };
    vaccinateMutation.mutate({ clientId: vaccinateClient.id, data: payload });
  };

  // Geo enrichment + filtering for the clients registry
  const geoMaps = useMemo(
    () => buildGeoMaps({ provinces, districts, villages, facilities }),
    [provinces, districts, villages, facilities],
  );

  const filteredClients = useMemo(() => {
    const enriched = withGeoColumns((clients ?? []) as any[], geoMaps);
    return enriched.filter((item) => {
      if (geoFilterProvinceId !== null && item._geoProvinceId !== geoFilterProvinceId) return false;
      if (geoFilterDistrictId !== null && item._geoDistrictId !== geoFilterDistrictId) return false;
      if (geoFilterFacilityId !== null && Number((item as any).facilityId) !== geoFilterFacilityId) return false;
      return true;
    });
  }, [clients, geoMaps, geoFilterProvinceId, geoFilterDistrictId, geoFilterFacilityId]);

  // Table Columns
  const clientColumns = [
    {
      key: "_geoProvinceName",
      header: "Province",
      sortable: true,
      render: (item: any) => (
        <span className="text-sm">{item._geoProvinceName || "—"}</span>
      ),
    },
    {
      key: "_geoDistrictName",
      header: "District",
      sortable: true,
      render: (item: any) => (
        <span className="text-sm">{item._geoDistrictName || "—"}</span>
      ),
    },
    {
      key: "name",
      header: "Client Name",
      sortable: true,
      render: (item: Client) => (
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
            item.clientType === "child" ? "bg-sky-500/10 text-sky-500" : "bg-rose-500/10 text-rose-500"
          }`}>
            {item.clientType === "child" ? <Baby className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </div>
          <div>
            <p className="font-medium text-sm leading-none mb-1">{item.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {item.clientType === "child" ? `${item.gender}, Child` : "Pregnant Woman"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "dateOfBirth",
      header: "Age / DOB",
      sortable: true,
      render: (item: Client) => {
        const dateStr = new Date(item.dateOfBirth).toLocaleDateString();
        if (item.clientType === "child") {
          const weeks = calculateWeeksOld(item.dateOfBirth);
          const ageDisplay = weeks < 4 ? `${weeks} wks` : `${Math.floor(weeks / 4.3)} mos`;
          return (
            <div>
              <p className="text-sm">{ageDisplay}</p>
              <p className="text-xs text-muted-foreground">{dateStr}</p>
            </div>
          );
        }
        return <span className="text-sm">{dateStr}</span>;
      },
    },
    // Original Code: Standard village display
    /*
    {
      key: "villageId",
      header: "Village",
      sortable: true,
      render: (item: Client) => (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="truncate max-w-40">{getVillageName(item.villageId)}</span>
        </div>
      ),
    },
    */

    // Updated Code: Render beautiful administrative residency path (Village, District, Province) 
    // or a specialized Cross-Border/Foreign Country badge.
    {
      key: "villageId",
      header: "Village / Residency",
      sortable: true,
      render: (item: Client) => {
        if (item.isCrossBorder) {
          return (
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/20 text-xs py-0.5 px-2 font-semibold">
                Cross-Border ({item.countryOfOrigin || "Foreign"})
              </Badge>
            </div>
          );
        }
        
        const vName = getVillageName(item.villageId);
        const path = getVillageResidencyPath(item.villageId);
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-sm font-medium">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate max-w-[150px]">{vName}</span>
            </div>
            {path && (
              <p className="text-[10px] text-muted-foreground leading-none ml-5 truncate max-w-[200px]" title={path}>
                {path}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "contactPhone",
      header: "Contact",
      render: (item: Client) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span>{item.contactPhone || "None"}</span>
          </div>
          {item.contactPhone && (
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                sendReminderMutation.mutate(item.id);
              }}
              disabled={sendReminderMutation.isPending}
              className="h-5 px-1 text-[9px] text-sky-500 hover:text-sky-600 font-bold hover:bg-sky-500/10 rounded-sm border border-sky-500/20"
              title="Send SMS Vaccination Reminder"
            >
              SMS
            </Button>
          )}
        </div>
      ),
    },
    // Original Code: Standard status flags display
    /*
    {
      key: "status",
      header: "Status Flags",
      render: (item: Client) => (
        <div className="flex flex-wrap gap-1">
          {item.isRefusal && (
            <Badge variant="destructive" className="text-[10px] py-0 px-1">
              Refusal
            </Badge>
          )}
          {Array.isArray(item.contraindications) && item.contraindications.length > 0 && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/10">
              Contra
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] py-0 px-1 capitalize">
            {item.catchmentStatus}
          </Badge>
        </div>
      ),
    },
    */

    // Updated Code: Render "Foreign" status badge for cross-border clients
    {
      key: "status",
      header: "Status Flags",
      render: (item: Client) => (
        <div className="flex flex-wrap gap-1">
          {item.isRefusal && (
            <Badge variant="destructive" className="text-[10px] py-0 px-1">
              Refusal
            </Badge>
          )}
          {Array.isArray(item.contraindications) && item.contraindications.length > 0 && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/10">
              Contra
            </Badge>
          )}
          {item.isCrossBorder && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/10">
              Foreign
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] py-0 px-1 capitalize">
            {item.isCrossBorder ? "Cross-Border" : item.catchmentStatus}
          </Badge>
        </div>
      ),
    },

    {
      key: "actions",
      header: "Actions",
      render: (item: Client) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedClient(item);
              setIsTimelineOpen(true);
            }}
            className="h-8 px-2"
          >
            Vax Card
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setVaccinateClient(item);
              setIsVaccinateOpen(true);
              // Setup default vaccine select
              vaccinationForm.reset({
                vaccineConfigId: 0,
                vaccineName: "",
                administeredDate: new Date().toISOString().split("T")[0],
                expiryDate: "",
                batchNumber: "",
                vvmStatus: "1",
              });
            }}
            className="h-8 px-2 flex items-center gap-1"
          >
            <Syringe className="h-3 w-3" />
            Vaccinate
          </Button>
        </div>
      ),
    },
  ];

  if (loadingClients || loadingConfigs) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Client Logbook & Registry
          </h1>
          <p className="text-muted-foreground text-sm">
            EPI/RED Standard infant and maternal immunization demographic register
          </p>
        </div>
        <Button
          onClick={() => {
            setIsAddClientOpen(true);
            clientForm.reset();
          }}
          className="flex items-center gap-2"
          data-testid="button-register-client"
        >
          <Plus className="h-4 w-4" />
          Register Client
        </Button>
      </div>

      {/* BULK REMINDER CAMPAIGNS PANEL */}
      <Card className="border shadow-xs bg-slate-50/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="h-4 w-4 text-sky-500" />
                Bulk SMS Reminder Campaigns
              </h3>
              <p className="text-xs text-muted-foreground">
                Broadcast automated mobile notifications to parents of children due for vaccine doses in selected intervals.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendBulkReminderMutation.mutate(7)}
                disabled={sendBulkReminderMutation.isPending}
                className="h-8 text-xs font-semibold hover:bg-sky-50 hover:text-sky-600 transition-colors"
              >
                1 Week Prior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendBulkReminderMutation.mutate(3)}
                disabled={sendBulkReminderMutation.isPending}
                className="h-8 text-xs font-semibold hover:bg-sky-50 hover:text-sky-600 transition-colors"
              >
                3 Days Prior
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => sendBulkReminderMutation.mutate(0)}
                disabled={sendBulkReminderMutation.isPending}
                className="h-8 text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors"
              >
                Today Due
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="registry" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="registry">Active Registry</TabsTrigger>
          <TabsTrigger value="due" className="flex items-center gap-1.5">
            Cohort Due Queue
            {dueQueue.length > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1 py-0 rounded-full flex items-center justify-center text-[10px]">
                {dueQueue.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="defaulters" className="flex items-center gap-1.5">
            Defaulters
            {defaulterCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1 py-0 rounded-full flex items-center justify-center text-[10px]">
                {defaulterCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="space-y-4 mt-6">
          <Card className="glassmorphic shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Demographic Registry</CardTitle>
              <CardDescription>
                Search, view, and vaccinate tracked infants and pregnant women in facility catchment
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <GeoCascadeFilter
                provinceId={geoFilterProvinceId}
                districtId={geoFilterDistrictId}
                facilityId={geoFilterFacilityId}
                onProvinceChange={setGeoFilterProvinceId}
                onDistrictChange={setGeoFilterDistrictId}
                onFacilityChange={setGeoFilterFacilityId}
                showFacility
                provinces={provinces}
                districts={districts}
                facilities={facilities}
                testIdPrefix="clients"
              />
              <DataTable
                data={filteredClients}
                columns={clientColumns}
                searchable
                searchKeys={["name", "parentName", "contactPhone"]}
                searchPlaceholder="Search client name, parent, phone..."
                onRowClick={(item) => {
                  setSelectedClient(item);
                  setIsTimelineOpen(true);
                }}
                emptyMessage="No clients registered in this facility context."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="due" className="space-y-4 mt-6">
          <div className="grid gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Dynamic Cohort Due Queue</h2>
                <p className="text-xs text-muted-foreground">
                  Infants and mothers currently due for vaccine doses based on standard schedule gaps
                </p>
              </div>
            </div>

            {dueQueue.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/20">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                <p className="font-semibold text-sm">All Clients Up to Date</p>
                <p className="text-xs">No active clients meet age/antigen requirements for vaccination.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {dueQueue.map(({ client, weeksOld, dueVaccines }) => (
                  <Card key={client.id} className="relative overflow-hidden border-l-4 border-l-destructive shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base">{client.name}</span>
                          <Badge variant="outline" className={`text-[10px] py-0 px-1.5 uppercase font-medium border-transparent ${
                            client.clientType === "child"
                              ? "bg-sky-500/10 text-sky-400 hover:bg-sky-500/10"
                              : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/10"
                          }`}>
                            {client.clientType === "child" ? `${weeksOld} wks old` : "Pregnant Woman"}
                          </Badge>
                          {client.isRefusal && (
                            <Badge variant="destructive" className="text-[10px] flex items-center gap-0.5">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Refusal Record
                            </Badge>
                          )}
                        </div>

                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span>{getVillageName(client.villageId)}</span>
                          </div>
                          {client.parentName && (
                            <div className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 shrink-0" />
                              <span>Parent: {client.parentName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <span>{client.contactPhone || "No Phone Contact"}</span>
                            </div>
                            {client.contactPhone && (
                              <Button
                                variant="ghost"
                                onClick={() => sendReminderMutation.mutate(client.id)}
                                disabled={sendReminderMutation.isPending}
                                className="h-5 px-1.5 text-[10px] text-sky-500 hover:text-sky-600 font-bold hover:bg-sky-500/10 rounded-sm transition-colors border border-sky-500/20"
                                title="Send SMS Vaccination Reminder"
                              >
                                Send SMS
                              </Button>
                            )}
                          </div>
                        </div>

                        {client.isRefusal && client.refusalReason && (
                          <div className="mt-2 bg-destructive/10 text-destructive text-xs p-2 rounded flex gap-1.5 items-start">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <p><strong>Refusal Reason:</strong> {client.refusalReason}</p>
                          </div>
                        )}

                        {Array.isArray(client.contraindications) && client.contraindications.length > 0 && (
                          <div className="mt-2 bg-amber-500/10 text-amber-500 text-xs p-2 rounded flex gap-1.5 items-start">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div>
                              <strong>Contraindications:</strong>
                              <ul className="list-disc pl-4 mt-0.5">
                                {client.contraindications.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-2 w-full md:w-auto shrink-0 justify-end">
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {dueVaccines.map((v) => {
                            const isContraindicated = Array.isArray(client.contraindications) && 
                              client.contraindications.some(c => c.toLowerCase().includes(v.name.toLowerCase()));
                            
                            return (
                              <Badge
                                key={v.id}
                                variant={isContraindicated ? "outline" : "outline"}
                                className={`text-xs py-1 px-2 flex items-center gap-1 ${
                                  isContraindicated 
                                    ? "border-amber-500 text-amber-500 bg-amber-500/5 cursor-not-allowed" 
                                    : "border-primary/50 text-primary bg-primary/5"
                                }`}
                                title={isContraindicated ? "Contraindicated Vaccine" : `Recommended at ${v.recommendedAge}`}
                              >
                                <Syringe className="h-3 w-3 shrink-0" />
                                {v.name}
                                {isContraindicated && <AlertTriangle className="h-3 w-3 text-amber-500 ml-0.5 shrink-0" />}
                              </Badge>
                            );
                          })}
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setVaccinateClient(client);
                            setIsVaccinateOpen(true);
                            vaccinationForm.reset({
                              vaccineConfigId: dueVaccines[0]?.id || 0,
                              vaccineName: dueVaccines[0]?.name || "",
                              administeredDate: new Date().toISOString().split("T")[0],
                              expiryDate: "",
                              batchNumber: "",
                              vvmStatus: "1",
                            });
                          }}
                          className="flex items-center gap-1.5"
                        >
                          <Syringe className="h-4 w-4" />
                          Vaccinate Doses
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="defaulters" className="space-y-4 mt-6">
          <Card className="glassmorphic shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                Defaulters in catchment
              </CardTitle>
              <CardDescription>
                Children with a routine vaccination dose overdue by more than 4
                weeks (routine RI only — campaign / SIA doses excluded). Click
                a row to open the client record.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {defaultersLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Loading defaulter list…
                </div>
              ) : defaulterRows.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/20">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                  <p className="font-semibold text-sm">No overdue children</p>
                  <p className="text-xs">All tracked infants are within their routine schedule.</p>
                </Card>
              ) : (
                <DataTable
                  data={defaulterRows}
                  searchable
                  searchKeys={["name", "parentName", "facilityName", "villageName"] as any}
                  searchPlaceholder="Search defaulter name, parent, facility, village…"
                  emptyMessage="No overdue children in your catchment."
                  onRowClick={(row: any) => {
                    const c = (clients ?? []).find((cl) => cl.id === row.clientId);
                    if (c) {
                      setSelectedClient(c);
                      setIsTimelineOpen(true);
                    }
                  }}
                  columns={[
                    { key: "name", header: "Child", sortable: true },
                    {
                      key: "nextDoseAntigen",
                      header: "Next due",
                      render: (r: any) => r.nextDoseAntigen.replace(/_/g, " "),
                    },
                    {
                      key: "daysOverdue",
                      header: "Days overdue",
                      sortable: true,
                      render: (r: any) => (
                        <Badge
                          variant="outline"
                          className={
                            r.daysOverdue >= 56
                              ? "border-rose-500 text-rose-600"
                              : r.daysOverdue >= 42
                                ? "border-amber-500 text-amber-600"
                                : "border-muted-foreground"
                          }
                        >
                          {r.daysOverdue}
                        </Badge>
                      ),
                    },
                    { key: "villageName", header: "Village", render: (r: any) => r.villageName ?? "—" },
                    { key: "facilityName", header: "Facility" },
                    {
                      key: "lastDoseAntigen",
                      header: "Last dose",
                      render: (r: any) =>
                        r.lastDoseAntigen
                          ? `${r.lastDoseAntigen.replace(/_/g, " ")} · ${new Date(r.lastDoseDate).toLocaleDateString()}`
                          : "None",
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: Register Client */}
      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Client Profile</DialogTitle>
          </DialogHeader>
          <Form {...clientForm}>
            {/* Original Code:
            <form onSubmit={clientForm.handleSubmit(onRegisterClientSubmit)} className="space-y-4 pt-2">
            */}
            {/* Updated Code: Added error callback to provide visual toast error messages and console logs if form validation fails. */}
            <form 
              onSubmit={clientForm.handleSubmit(
                onRegisterClientSubmit,
                (errors) => {
                  console.error("Client registration validation failed:", errors);
                  toast({
                    title: "Validation Failed",
                    description: Object.entries(errors).map(([key, err]) => {
                      const msg = (err as any).message || "Invalid value";
                      return `${key}: ${msg}`;
                    }).join("; ") || "Please check that all required fields are filled correctly.",
                    variant: "destructive",
                  });
                }
              )} 
              className="space-y-4 pt-2"
            >
              {user?.role === "national_admin" && (
                <div className="space-y-4 p-3 rounded-lg border bg-muted/10">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Administrative Overrides</h4>
                  
                  {!clientForm.watch("isCrossBorder") && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block uppercase">Province</label>
                        <Select
                          value={adminProvinceId ? String(adminProvinceId) : ""}
                          onValueChange={(val) => {
                            const pId = parseInt(val);
                            setAdminProvinceId(pId);
                            setAdminDistrictId(null);
                            setAdminFacilityId(null);
                            clientForm.setValue("villageId", undefined as any);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Province" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinces?.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block uppercase">District</label>
                        <Select
                          value={adminDistrictId ? String(adminDistrictId) : ""}
                          disabled={!adminProvinceId}
                          onValueChange={(val) => {
                            const dId = parseInt(val);
                            setAdminDistrictId(dId);
                            setAdminFacilityId(null);
                            clientForm.setValue("villageId", undefined as any);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="District" />
                          </SelectTrigger>
                          <SelectContent>
                            {districts
                              ?.filter((d) => d.provinceId === adminProvinceId)
                              .map((d) => (
                                <SelectItem key={d.id} value={String(d.id)} className="text-xs">
                                  {d.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block uppercase">Facility</label>
                        <Select
                          value={adminFacilityId ? String(adminFacilityId) : ""}
                          disabled={!adminDistrictId}
                          onValueChange={(val) => {
                            const fId = parseInt(val);
                            setAdminFacilityId(fId);
                            clientForm.setValue("villageId", undefined as any);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {facilities
                              ?.filter((f) => f.districtId === adminDistrictId)
                              .map((f) => (
                                <SelectItem key={f.id} value={String(f.id)} className="text-xs">
                                  {f.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={clientForm.control}
                    name="justification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-destructive">
                          Required Override Justification *
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="State the reason why you are creating/overriding this client record..."
                            className="min-h-[60px] resize-none text-xs"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. John Tembo Junior" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={clientForm.control}
                  name="clientType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Type</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          // trigger re-eval of type dependencies
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="child">Child / Infant</SelectItem>
                          <SelectItem value="pregnant_woman">Pregnant Woman</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clientForm.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {clientForm.watch("clientType") === "child" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={clientForm.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "male"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="parentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mother/Guardian Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Mary Tembo" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Original Code: Standard village selection and catchment status fields */}
              {/*
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={clientForm.control}
                  name="villageId"
                  render={({ field }) => (
                    ...
                  )}
                />
                <FormField
                  control={clientForm.control}
                  name="catchmentStatus"
                  render={({ field }) => (
                    ...
                  )}
                />
              </div>
              */}

              {/* Updated Code:
                  Implement Switch toggle to select whether the client is a local catchment community resident 
                  or a cross-border/foreign patient, and conditionally render the respective form inputs. */}
              <FormField
                control={clientForm.control}
                name="isCrossBorder"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3 bg-muted/20 shadow-xs">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">Cross-Border / Foreign Client</FormLabel>
                      <p className="text-xs text-muted-foreground font-normal">
                        Toggle on for clients residing outside national boundaries (e.g. neighboring country)
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (checked) {
                            clientForm.setValue("villageId", null);
                          } else {
                            clientForm.setValue("villageId", undefined);
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!clientForm.watch("isCrossBorder") ? (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={clientForm.control}
                    name="villageId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <FormLabel>Residential Village</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isCrossTenantView}
                            title={isCrossTenantView ? `Read-only view of ${tenantInfo?.name ?? "another country"} — switch back to your home country to add villages.` : undefined}
                            className="h-auto p-0 text-sky-500 font-semibold flex items-center gap-0.5 hover:text-sky-600 hover:bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => {
                              if (isCrossTenantView) {
                                crossTenantToast();
                                return;
                              }
                              setIsAddVillageOpen(true);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Village
                          </Button>
                        </div>
                        {isCrossTenantView && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Read-only view of {tenantInfo?.name ?? "another country"}. Switch back to your home country to add villages.
                          </p>
                        )}
                        <Popover open={isVillageSelectOpen} onOpenChange={setIsVillageSelectOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isVillageSelectOpen}
                                className={cn(
                                  "w-full justify-between text-left font-normal border-input hover:bg-transparent",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <span className="truncate">
                                  {field.value
                                    ? villages?.find((v) => v.id === field.value)?.name
                                    : "Select village..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search village..." />
                              <CommandEmpty className="py-6 text-center text-sm">
                                <p className="text-muted-foreground mb-2 font-normal">No village found.</p>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={isCrossTenantView}
                                  title={isCrossTenantView ? `Read-only view of ${tenantInfo?.name ?? "another country"} — switch back to your home country to add villages.` : undefined}
                                  className="h-8 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => {
                                    if (isCrossTenantView) {
                                      crossTenantToast();
                                      return;
                                    }
                                    setIsVillageSelectOpen(false);
                                    setIsAddVillageOpen(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add New Village
                                </Button>
                              </CommandEmpty>
                              <CommandList className="max-h-[250px] overflow-y-auto">
                                {catchmentVillages.length > 0 && (
                                  <CommandGroup heading="Catchment Area Communities">
                                    {catchmentVillages.map((v) => (
                                      <CommandItem
                                        key={v.id}
                                        value={v.name}
                                        onSelect={() => {
                                          field.onChange(v.id);
                                          setIsVillageSelectOpen(false);
                                        }}
                                        className="flex items-center justify-between font-normal"
                                      >
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="font-medium text-foreground">{v.name}</span>
                                          {v.isHardToReach && (
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] px-1 py-0 h-4">
                                              HTR
                                            </Badge>
                                          )}
                                        </div>
                                        <Check
                                          className={cn(
                                            "h-4 w-4 shrink-0 text-sky-500",
                                            field.value === v.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                                {otherVillages.length > 0 && (
                                  <CommandGroup heading="Other / Neighboring Communities">
                                    {otherVillages.map((v) => (
                                      <CommandItem
                                        key={v.id}
                                        value={v.name}
                                        onSelect={() => {
                                          field.onChange(v.id);
                                          setIsVillageSelectOpen(false);
                                        }}
                                        className="flex items-center justify-between font-normal"
                                      >
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="font-medium text-muted-foreground">{v.name}</span>
                                          {v.isHardToReach && (
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] px-1 py-0 h-4">
                                              HTR
                                            </Badge>
                                          )}
                                        </div>
                                        <Check
                                          className={cn(
                                            "h-4 w-4 shrink-0 text-sky-500",
                                            field.value === v.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        
                        {/* Interactive Administrative Residency Tracing Info Badge */}
                        {field.value && (
                          <div className="mt-1.5 p-2 rounded-lg bg-sky-500/5 border border-sky-500/10 flex items-center gap-1.5 text-xs text-sky-600 animate-in fade-in slide-in-from-top-1 duration-200">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              Residency: <span className="font-semibold">{getVillageResidencyPath(field.value)}</span>
                            </span>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="catchmentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catchment Isolation</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="catchment">Catchment Zone</SelectItem>
                            <SelectItem value="non-catchment">Out of Catchment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={clientForm.control}
                      name="countryOfOrigin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country of Origin</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Angola">Angola</SelectItem>
                              <SelectItem value="DR Congo">DR Congo</SelectItem>
                              <SelectItem value="Tanzania">Tanzania</SelectItem>
                              <SelectItem value="Malawi">Malawi</SelectItem>
                              <SelectItem value="Mozambique">Mozambique</SelectItem>
                              <SelectItem value="Zimbabwe">Zimbabwe</SelectItem>
                              <SelectItem value="Botswana">Botswana</SelectItem>
                              <SelectItem value="Namibia">Namibia</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clientForm.control}
                      name="borderPointOfEntry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Border Point of Entry</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Chirundu, Kariba" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={clientForm.control}
                    name="foreignResidence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Foreign Residence Details</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Village/Town, District/Province of origin" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}


              <FormField
                control={clientForm.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. +260 977 123456" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2 border-t space-y-4">
                <FormField
                  control={clientForm.control}
                  name="isRefusal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-destructive/5 border-destructive/20">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-destructive font-semibold">Active Vaccine Refusal Alert</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Check if family actively refuses or has high hesitancy for immunizations
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {clientForm.watch("isRefusal") && (
                  <FormField
                    control={clientForm.control}
                    name="refusalReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Refusal Reason / Justification</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Religious grounds, fear of adverse reaction" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="button" onClick={() => setIsAddClientOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createClientMutation.isPending}>
                  {createClientMutation.isPending ? "Saving..." : "Save Client Record"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Edit Client */}
      <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client Profile</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form 
              onSubmit={editForm.handleSubmit(
                onEditClientSubmit,
                (errors) => {
                  console.error("Client profile edit validation failed:", errors);
                  toast({
                    title: "Validation Failed",
                    description: Object.entries(errors).map(([key, err]) => {
                      const msg = (err as any).message || "Invalid value";
                      return `${key}: ${msg}`;
                    }).join("; ") || "Please check that all required fields are filled correctly.",
                    variant: "destructive",
                  });
                }
              )} 
              className="space-y-4 pt-2"
            >
              {user?.role === "national_admin" && (
                <div className="space-y-4 p-3 rounded-lg border bg-muted/10">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Administrative Overrides</h4>
                  
                  {!editForm.watch("isCrossBorder") && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block uppercase">Province</label>
                        <Select
                          value={adminProvinceId ? String(adminProvinceId) : ""}
                          onValueChange={(val) => {
                            const pId = parseInt(val);
                            setAdminProvinceId(pId);
                            setAdminDistrictId(null);
                            setAdminFacilityId(null);
                            editForm.setValue("villageId", undefined as any);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Province" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinces?.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block uppercase">District</label>
                        <Select
                          value={adminDistrictId ? String(adminDistrictId) : ""}
                          disabled={!adminProvinceId}
                          onValueChange={(val) => {
                            const dId = parseInt(val);
                            setAdminDistrictId(dId);
                            setAdminFacilityId(null);
                            editForm.setValue("villageId", undefined as any);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="District" />
                          </SelectTrigger>
                          <SelectContent>
                            {districts
                              ?.filter((d) => d.provinceId === adminProvinceId)
                              .map((d) => (
                                <SelectItem key={d.id} value={String(d.id)} className="text-xs">
                                  {d.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block uppercase">Facility</label>
                        <Select
                          value={adminFacilityId ? String(adminFacilityId) : ""}
                          disabled={!adminDistrictId}
                          onValueChange={(val) => {
                            const fId = parseInt(val);
                            setAdminFacilityId(fId);
                            editForm.setValue("villageId", undefined as any);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Facility" />
                          </SelectTrigger>
                          <SelectContent>
                            {facilities
                              ?.filter((f) => f.districtId === adminDistrictId)
                              .map((f) => (
                                <SelectItem key={f.id} value={String(f.id)} className="text-xs">
                                  {f.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={editForm.control}
                    name="justification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-destructive">
                          Required Override Justification *
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="State the reason why you are modifying this client record..."
                            className="min-h-[60px] resize-none text-xs"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. John Tembo Junior" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="clientType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Type</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                        }}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="child">Child / Infant</SelectItem>
                          <SelectItem value="pregnant_woman">Pregnant Woman</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {editForm.watch("clientType") === "child" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "male"} value={field.value || "male"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="parentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mother/Guardian Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Mary Tembo" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={editForm.control}
                name="isCrossBorder"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3 bg-muted/20 shadow-xs">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">Cross-Border / Foreign Client</FormLabel>
                      <p className="text-xs text-muted-foreground font-normal">
                        Toggle on for clients residing outside national boundaries
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (checked) {
                            editForm.setValue("villageId", null);
                          } else {
                            editForm.setValue("villageId", undefined);
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!editForm.watch("isCrossBorder") ? (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="villageId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <FormLabel>Residential Village</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isCrossTenantView}
                            title={isCrossTenantView ? `Read-only view of ${tenantInfo?.name ?? "another country"} — switch back to your home country to add villages.` : undefined}
                            className="h-auto p-0 text-sky-500 font-semibold flex items-center gap-0.5 hover:text-sky-600 hover:bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => {
                              if (isCrossTenantView) {
                                crossTenantToast();
                                return;
                              }
                              setIsAddVillageOpen(true);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Village
                          </Button>
                        </div>
                        {isCrossTenantView && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Read-only view of {tenantInfo?.name ?? "another country"}. Switch back to your home country to add villages.
                          </p>
                        )}
                        <Popover open={isVillageSelectOpen} onOpenChange={setIsVillageSelectOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isVillageSelectOpen}
                                className={cn(
                                  "w-full justify-between text-left font-normal border-input hover:bg-transparent",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <span className="truncate">
                                  {field.value
                                    ? villages?.find((v) => v.id === Number(field.value))?.name
                                    : "Select village..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search village..." />
                              <CommandEmpty className="py-6 text-center text-sm">
                                <p className="text-muted-foreground mb-2 font-normal">No village found.</p>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={isCrossTenantView}
                                  title={isCrossTenantView ? `Read-only view of ${tenantInfo?.name ?? "another country"} — switch back to your home country to add villages.` : undefined}
                                  className="h-8 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => {
                                    if (isCrossTenantView) {
                                      crossTenantToast();
                                      return;
                                    }
                                    setIsVillageSelectOpen(false);
                                    setIsAddVillageOpen(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add New Village
                                </Button>
                              </CommandEmpty>
                              <CommandList className="max-h-[250px] overflow-y-auto">
                                {catchmentVillages.length > 0 && (
                                  <CommandGroup heading="Catchment Area Communities">
                                    {catchmentVillages.map((v) => (
                                      <CommandItem
                                        key={v.id}
                                        value={v.name}
                                        onSelect={() => {
                                          field.onChange(v.id);
                                          setIsVillageSelectOpen(false);
                                        }}
                                        className="flex items-center justify-between font-normal"
                                      >
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="font-medium text-foreground">{v.name}</span>
                                          {v.isHardToReach && (
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] px-1 py-0 h-4">
                                              HTR
                                            </Badge>
                                          )}
                                        </div>
                                        <Check
                                          className={cn(
                                            "h-4 w-4 shrink-0 text-sky-500",
                                            field.value === v.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                                {otherVillages.length > 0 && (
                                  <CommandGroup heading="Other / Neighboring Communities">
                                    {otherVillages.map((v) => (
                                      <CommandItem
                                        key={v.id}
                                        value={v.name}
                                        onSelect={() => {
                                          field.onChange(v.id);
                                          setIsVillageSelectOpen(false);
                                        }}
                                        className="flex items-center justify-between font-normal"
                                      >
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="font-medium text-muted-foreground">{v.name}</span>
                                          {v.isHardToReach && (
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] px-1 py-0 h-4">
                                              HTR
                                            </Badge>
                                          )}
                                        </div>
                                        <Check
                                          className={cn(
                                            "h-4 w-4 shrink-0 text-sky-500",
                                            field.value === v.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        
                        {field.value && (
                          <div className="mt-1.5 p-2 rounded-lg bg-sky-500/5 border border-sky-500/10 flex items-center gap-1.5 text-xs text-sky-600 animate-in fade-in slide-in-from-top-1 duration-200">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              Residency: <span className="font-semibold">{getVillageResidencyPath(Number(field.value))}</span>
                            </span>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="catchmentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catchment Isolation</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="catchment">Catchment Zone</SelectItem>
                            <SelectItem value="non-catchment">Out of Catchment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="countryOfOrigin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country of Origin</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Angola">Angola</SelectItem>
                              <SelectItem value="DR Congo">DR Congo</SelectItem>
                              <SelectItem value="Tanzania">Tanzania</SelectItem>
                              <SelectItem value="Malawi">Malawi</SelectItem>
                              <SelectItem value="Mozambique">Mozambique</SelectItem>
                              <SelectItem value="Zimbabwe">Zimbabwe</SelectItem>
                              <SelectItem value="Botswana">Botswana</SelectItem>
                              <SelectItem value="Namibia">Namibia</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="borderPointOfEntry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Border Point of Entry</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Chirundu, Kariba" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="foreignResidence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Foreign Residence Details</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Village/Town, District/Province of origin" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={editForm.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. +260 977 123456" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2 border-t space-y-4">
                <FormField
                  control={editForm.control}
                  name="isRefusal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-destructive/5 border-destructive/20">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-destructive font-semibold">Active Vaccine Refusal Alert</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Check if family actively refuses or has high hesitancy for immunizations
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {editForm.watch("isRefusal") && (
                  <FormField
                    control={editForm.control}
                    name="refusalReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Refusal Reason / Justification</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Religious grounds, fear of adverse reaction" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="button" onClick={() => setIsEditClientOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Add Village Inline */}
      <Dialog
        open={isAddVillageOpen}
        onOpenChange={(open) => {
          setIsAddVillageOpen(open);
          // Clear any stale mutation error when the dialog reopens so the
          // inline error banner doesn't show up on a fresh attempt.
          if (open) {
            createVillageMutation.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px] border-border/80 bg-background/95 backdrop-blur-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Plus className="h-5 w-5 text-sky-500" />
              <span>Add Catchment Village</span>
            </DialogTitle>
          </DialogHeader>
          {createVillageMutation.isError && (() => {
            const err: any = createVillageMutation.error;
            const rawMsg = err?.message ?? String(err ?? "");
            const is403 = /^403:?\s/.test(rawMsg) || /viewing another country/i.test(rawMsg);
            return (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{is403 ? "Read-only view" : "Couldn't add village"}</AlertTitle>
                <AlertDescription>
                  {is403
                    ? `You're viewing ${tenantInfo?.name ?? "another country"} read-only. Switch back to your home country to add villages.`
                    : (rawMsg.replace(/^\d{3}:\s*/, "") || "Something went wrong. Please try again.")}
                </AlertDescription>
              </Alert>
            );
          })()}
          <Form {...villageForm}>
            {/* Original Code: Silent on form validation errors, causing the button to do nothing with no visual cues.
            <form onSubmit={villageForm.handleSubmit((values) => createVillageMutation.mutate(values))} className="space-y-4 pt-2">
            */}
            {/* Updated Code: Added error callback to provide visual toast error messages if form validation fails. */}
            <form 
              onSubmit={villageForm.handleSubmit(
                (values) => createVillageMutation.mutate(values),
                (errors) => {
                  console.error("Add Village validation failed:", errors);
                  toast({
                    title: "Form Validation Failed",
                    description: errors.name?.message || "Please check that all required fields are filled correctly.",
                    variant: "destructive",
                  });
                }
              )} 
              className="space-y-4 pt-2"
            >
              <FormField
                control={villageForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Village / Community Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Zambezi East Outreach" className="bg-background/50 border-input focus-visible:ring-sky-500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Updated Code: Include Geolocation trigger buttons and Collapsible Leaflet Map container */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={villageForm.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Latitude (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. -15.12345" className="bg-background/50 border-input focus-visible:ring-sky-500 font-medium" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={villageForm.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Longitude (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 28.54321" className="bg-background/50 border-input focus-visible:ring-sky-500 font-medium" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Geolocation Controls & Collapsible Leaflet mini-map picker */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs hover:bg-accent border border-border/80 bg-background/30 backdrop-blur-xs font-semibold h-9"
                    onClick={handleUseCurrentLocation}
                    disabled={isGettingGps}
                  >
                    <Locate className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                    {isGettingGps ? "Acquiring..." : "Use Current GPS"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs hover:bg-accent border border-border/80 bg-background/30 backdrop-blur-xs font-semibold h-9"
                    onClick={() => setIsMapExpanded(!isMapExpanded)}
                  >
                    <MapPin className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                    {isMapExpanded ? "Hide Map Picker" : "Show Map Picker"}
                  </Button>
                </div>

                {isMapExpanded && (
                  <div className="h-[220px] w-full rounded-lg border border-border/80 overflow-hidden relative shadow-inner z-0 animate-in fade-in duration-300">
                    <MapContainer
                      center={mapCenter}
                      zoom={13}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <ChangeMapView center={mapCenter} />
                      <MapEvents onClick={handleMapClick} />
                      {watchLat && watchLng && !isNaN(parseFloat(watchLat)) && !isNaN(parseFloat(watchLng)) && (
                        <Marker position={[parseFloat(watchLat), parseFloat(watchLng)]} icon={OFFLINE_VILLAGE_ICON} />
                      )}
                    </MapContainer>
                  </div>
                )}
              </div>

              <FormField
                control={villageForm.control}
                name="isHardToReach"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 bg-amber-500/5 border-amber-500/20 shadow-xs">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" />
                    </FormControl>
                    <div className="space-y-1 leading-none cursor-pointer" onClick={() => field.onChange(!field.value)}>
                      <FormLabel className="text-amber-600 font-semibold cursor-pointer">Hard-to-Reach (HTR) Community</FormLabel>
                      <p className="text-xs text-muted-foreground font-normal">
                        Requires specialized outreach logistics or mobile sessions due to terrain or distance
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                <Button variant="outline" type="button" onClick={() => setIsAddVillageOpen(false)} className="hover:bg-accent">Cancel</Button>
                <Button type="submit" disabled={createVillageMutation.isPending} className="bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-md hover:shadow-lg transition-all">
                  {createVillageMutation.isPending ? "Adding..." : "Add Village"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Log Vaccination */}
      <Dialog open={isVaccinateOpen} onOpenChange={setIsVaccinateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log Administered Vaccine Dose</DialogTitle>
          </DialogHeader>
          {vaccinateClient && (
            <div className="bg-muted/50 p-3 rounded text-sm mb-2">
              <p><strong>Recipient:</strong> {vaccinateClient.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                Type: {vaccinateClient.clientType === "child" ? "Child" : "Pregnant Woman"}
              </p>
            </div>
          )}
          <Form {...vaccinationForm}>
            <form 
              onSubmit={vaccinationForm.handleSubmit(
                onVaccinateSubmit,
                (errors) => {
                  console.error("Vaccination logging validation failed:", errors);
                  toast({
                    title: "Validation Failed",
                    description: Object.entries(errors).map(([key, err]) => {
                      const msg = (err as any).message || "Invalid value";
                      return `${key}: ${msg}`;
                    }).join("; ") || "Please check that all required fields are filled correctly.",
                    variant: "destructive",
                  });
                }
              )} 
              className="space-y-4 pt-2"
            >
              <FormField
                control={vaccinationForm.control}
                name="vaccineConfigId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Antigen Dose</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(parseInt(val));
                        const name = vaccineConfigs?.find((c) => c.id === parseInt(val))?.name || "";
                        vaccinationForm.setValue("vaccineName", name);
                      }}
                      defaultValue={field.value ? String(field.value) : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose due antigen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vaccineConfigs
                          ?.filter((c) => {
                            if (!vaccinateClient) return true;
                            return vaccinateClient.clientType === "child"
                              ? c.targetGroup === "under1" || c.targetGroup === "births"
                              : c.targetGroup === "pregnant";
                          })
                          .map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name} ({c.recommendedAge})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={vaccinationForm.control}
                  name="administeredDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Administration Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={vaccinationForm.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vaccine Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={vaccinationForm.control}
                  name="batchNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. B892A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={vaccinationForm.control}
                  name="vvmStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VVM Status (1-4)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="VVM Stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Stage 1: Good (Inner square light)</SelectItem>
                          <SelectItem value="2">Stage 2: Good (Still lighter than outer)</SelectItem>
                          <SelectItem value="3">Stage 3: Exceeded (Discard limit reached)</SelectItem>
                          <SelectItem value="4">Stage 4: Blown (Inner square dark)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="button" onClick={() => setIsVaccinateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={vaccinateMutation.isPending}>
                  {vaccinateMutation.isPending ? "Logging..." : "Log Immunization"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Timeline / Vaccine Card */}
      <Dialog open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader className="no-print">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Layers className="h-5 w-5 text-indigo-500" />
              Patient Health & Immunization Card
            </DialogTitle>
          </DialogHeader>
          
          {/* Original Code: Print styling using visibility: hidden on body, causing blank prints in Radix portals
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              .vax-card-print-area, .vax-card-print-area * {
                visibility: visible !important;
              }
              .vax-card-print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                background: white !important;
                color: black !important;
                padding: 0px !important;
                margin: 0px !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
              .print-double-sided {
                display: flex !important;
                flex-direction: row !important;
                justify-content: center !important;
                gap: 16px !important;
                width: 100% !important;
              }
              .print-card-side {
                width: 48% !important;
                min-width: 48% !important;
                border: 2px solid #000000 !important;
                border-radius: 8px !important;
                padding: 16px !important;
                background: #ffffff !important;
                page-break-inside: avoid !important;
                min-height: 480px !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                box-shadow: none !important;
              }
            }
          `}} />
          */}

          {/* Updated Code: Print styling targeting explicit DOM structural wrappers to preserve Radix dialog portals */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              #root, header, footer, [data-sidebar], .no-print, [role="dialog"] > :not(.vax-card-print-area) {
                display: none !important;
              }
              [role="dialog"] {
                position: absolute !important;
                top: 0 !important; left: 0 !important;
                width: 100% !important; border: none !important;
                box-shadow: none !important; background: transparent !important;
                padding: 0 !important; margin: 0 !important;
              }
              [data-state="open"] {
                background: transparent !important;
                backdrop-filter: none !important;
              }
              .vax-card-print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                background: white !important;
                color: black !important;
                padding: 0px !important;
                margin: 0px !important;
                box-shadow: none !important;
                border: none !important;
              }
              .print-double-sided {
                display: flex !important;
                flex-direction: row !important;
                justify-content: center !important;
                gap: 16px !important;
                width: 100% !important;
              }
              .print-card-side {
                width: 48% !important;
                min-width: 48% !important;
                border: 2px solid #000000 !important;
                border-radius: 8px !important;
                padding: 16px !important;
                background: #ffffff !important;
                page-break-inside: avoid !important;
                min-height: 480px !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                box-shadow: none !important;
              }
            }
          `}} />

          {selectedClient && (() => {
            const tenantCode = tenant?.code || user?.tenantId || "SSD";
            
            const findVaccination = (code: string, name: string) => {
              return clientVaccinations?.find(
                (v: any) => 
                  v.vaccineCode?.toUpperCase() === code.toUpperCase() || 
                  v.vaccineName?.toLowerCase().includes(name.toLowerCase())
              );
            };

            const getDoseStatus = (dose: typeof VACCINE_SCHEDULE[0]) => {
              const matchingVac: any = findVaccination(dose.code, dose.name);
              if (matchingVac) {
                return {
                  status: "administered" as const,
                  record: matchingVac,
                  date: new Date(matchingVac.administeredDate).toLocaleDateString(),
                  facility: getFacilityName(matchingVac.facilityId || selectedClient.facilityId),
                };
              }

              const dob = new Date(selectedClient.dateOfBirth);
              const dueDate = new Date(dob.getTime() + dose.weeks * 7 * 24 * 60 * 60 * 1000);
              const today = new Date();

              if (today > dueDate) {
                return {
                  status: "overdue" as const,
                  dueDate: dueDate.toLocaleDateString(),
                  weeksOverdue: Math.floor((today.getTime() - dueDate.getTime()) / (7 * 24 * 60 * 60 * 1000)),
                };
              }

              return {
                status: "pending" as const,
                dueDate: dueDate.toLocaleDateString(),
              };
            };

            const givenDosesCount = clientVaccinations?.filter(
              (v: any) => v.clientId === selectedClient.id
            ).length || 0;
            const totalDosesCount = VACCINE_SCHEDULE.length;
            const completionRatePercent = Math.round((givenDosesCount / totalDosesCount) * 100);

            return (
              <div className="space-y-6 pt-2 vax-card-print-area">
                
                {/* EPI Certified Authenticity Verified Alert Banner */}
                {isVerifiedScan && (
                  <div className="no-print bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 p-3.5 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <BadgeCheck className="h-5 w-5 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider leading-none">EPI Certified Authentic Record</h4>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        This vaccination history card has been digitally checked and validated by the Ministry of Health registry database.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Device-Only Progress Telemetry Dashboard (Hidden on Print) */}
                <div className="no-print bg-secondary/40 border border-border/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs px-2.5 font-bold rounded-lg uppercase">
                        Active E-Health Card
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">ID: {selectedClient.id?.substring(0, 12).toUpperCase()}</span>
                    </div>
                    <h3 className="text-lg font-black text-foreground font-sans mt-0.5">{selectedClient.name}</h3>
                  </div>
                  <div className="min-w-[240px] space-y-1.5 self-stretch md:self-auto flex flex-col justify-center">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Antigen Schedule Completion</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{givenDosesCount} / {totalDosesCount} Doses ({completionRatePercent}%)</span>
                    </div>
                    <div className="h-2.5 w-full bg-muted dark:bg-slate-800 rounded-full overflow-hidden border border-border/30">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700 rounded-full" style={{ width: `${completionRatePercent}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* AI Clinical Catch-up Assistant Card Panel (Hidden on Print) */}
                {(() => {
                  const catchUpPlan = getAICatchUpPlan(selectedClient, clientVaccinations || []);
                  const overdueDoses = catchUpPlan.filter(p => p.status === "overdue");
                  const upcomingDoses = catchUpPlan.filter(p => p.status === "due_soon");
                  
                  if (catchUpPlan.length === 0) return null;

                  return (
                    <div className="no-print relative overflow-hidden bg-radial from-slate-900/10 via-slate-900/5 to-transparent dark:from-indigo-500/10 dark:via-indigo-500/5 dark:to-transparent border border-indigo-500/30 dark:border-indigo-500/20 backdrop-blur-xl rounded-3xl p-6 shadow-xl shadow-indigo-500/5 animate-in fade-in duration-500 ring-1 ring-white/10">
                      {/* Ambient background glow */}
                      <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
                      <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
                      
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/30">
                              <BadgeCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                            </div>
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                              AI Clinical Catch-up Assistant
                            </span>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-foreground">WHO Immunization Cohort Catch-up Plan</h4>
                          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                            Personalized vaccine scheduling automatically compiled using current WHO guidelines and minimum dose spacing constraints (strict 4-week gap spacing enforced for multi-dose series).
                          </p>
                        </div>
                        <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold py-1 px-2.5 rounded-lg shrink-0">
                          {overdueDoses.length > 0 ? `${overdueDoses.length} Overdue Doses` : "Schedule Up to Date"}
                        </Badge>
                      </div>

                      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Overdue column */}
                        <div className="space-y-3">
                          <h5 className="text-[11px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5 pl-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                            Urgent Actions (Overdue)
                          </h5>
                          <div className="space-y-2.5">
                            {overdueDoses.length === 0 ? (
                              <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Excellent! There are no overdue immunization doses detected for this client.
                                </p>
                              </div>
                            ) : (
                              overdueDoses.map((dose, idx) => (
                                <div key={idx} className="group relative overflow-hidden bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/20 dark:border-rose-500/30 rounded-2xl p-4 transition-all duration-300 hover:border-rose-500/40 hover:bg-rose-500/10 shadow-xs">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono">
                                        {dose.antigen}
                                      </span>
                                      <p className="text-xs text-foreground font-medium leading-relaxed">
                                        {dose.advisory}
                                      </p>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-md py-0.5 px-1.5 shrink-0">
                                      Immediate
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Upcoming / Recommended Next Visit column */}
                        <div className="space-y-3">
                          <h5 className="text-[11px] font-black uppercase tracking-wider text-sky-500 flex items-center gap-1.5 pl-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
                            Future Schedule & Next Visit
                          </h5>
                          <div className="space-y-2.5">
                            {upcomingDoses.length === 0 ? (
                              <div className="bg-slate-500/5 border border-slate-500/20 rounded-2xl p-4 flex items-center gap-3">
                                <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                                <p className="text-xs text-muted-foreground font-medium">
                                  No upcoming routine doses scheduled in the immediate horizon.
                                </p>
                              </div>
                            ) : (
                              upcomingDoses.slice(0, 3).map((dose, idx) => (
                                <div key={idx} className="group relative overflow-hidden bg-sky-500/5 dark:bg-sky-950/10 border border-sky-500/20 dark:border-sky-500/30 rounded-2xl p-4 transition-all duration-300 hover:border-sky-500/40 hover:bg-sky-500/10 shadow-xs">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <span className="text-xs font-black text-sky-600 dark:text-sky-400 font-mono">
                                        {dose.antigen}
                                      </span>
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        {dose.advisory}
                                      </p>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 rounded-md py-0.5 px-1.5 shrink-0">
                                      {new Date(dose.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}

                            {/* recommended next visit block */}
                            {(() => {
                              const nextVisitDate = catchUpPlan[0]?.dueDate;
                              if (!nextVisitDate) return null;
                              return (
                                <div className="mt-2 p-3 bg-gradient-to-r from-indigo-500/10 to-teal-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-indigo-500 shrink-0" />
                                    <div className="text-[11px] leading-tight">
                                      <p className="text-muted-foreground font-medium">Recommended Next Clinic Visit</p>
                                      <p className="text-indigo-600 dark:text-indigo-400 font-extrabold">{new Date(nextVisitDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                      Auto-Scheduled
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Inline Share & Message Form Panel (Hidden on Print) */}
                {isShareOpen && shareMethod && (
                  <div className="no-print bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        {shareMethod === "email" ? (
                          <Mail className="h-4 w-4 text-indigo-500" />
                        ) : shareMethod === "sms" ? (
                          <MessageSquare className="h-4 w-4 text-indigo-500" />
                        ) : (
                          <Share2 className="h-4 w-4 text-indigo-500" />
                        )}
                        Dispatch via {shareMethod === "email" ? "Email Address" : shareMethod === "sms" ? "SMS Mobile Number" : "WhatsApp Messenger"}
                      </h4>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full hover:bg-muted" 
                        onClick={() => { setIsShareOpen(false); setShareMethod(null); setShareInput(""); }}
                      >
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={
                          shareMethod === "email" 
                            ? "guardian.email@gmail.com" 
                            : "+260 977 123456"
                        }
                        value={shareInput}
                        onChange={(e) => setShareInput(e.target.value)}
                        className="bg-background rounded-xl h-10 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-indigo-500"
                      />
                      <Button 
                        onClick={handleShareSubmit} 
                        disabled={isSharing}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 flex items-center gap-1.5 text-xs font-semibold shadow-md shadow-indigo-600/10"
                      >
                        {isSharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        <span>Send</span>
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Transmits a secure, certified PDF immunization booklet and upcoming reminder schedule details instantly to the guardian.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-6 print:border-none print:pb-0 print-double-sided">
                  
                  {/* SIDE A: CHILD HEALTH CARD FRONT */}
                  <div className="relative overflow-hidden border rounded-3xl p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/30 dark:to-slate-900/10 shadow-lg border-slate-200/80 dark:border-white/5 flex flex-col justify-between min-h-[500px] print-card-side">
                    {/* Security Crest Watermark */}
                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.01] pointer-events-none flex items-center justify-center print:opacity-[0.02]">
                      <Layers className="h-72 w-72" />
                    </div>

                    <div>
                      {/* National Emblem & Title Header */}
                      <div className="flex items-center justify-between gap-3 border-b pb-4 mb-5 border-slate-200 print:border-black">
                        <div className="flex items-center gap-3">
                          {(tenantCode === "ZMB" || tenant?.name?.toLowerCase().includes("zambia") || tenant?.code?.toLowerCase().includes("zmb")) ? (
                            <img 
                              src="/zambia-coat-of-arms.png" 
                              alt="Zambia Coat of Arms" 
                              className="h-12 w-12 shrink-0 object-contain"
                            />
                          ) : (
                            <div className="h-11 w-11 shrink-0 bg-primary/10 rounded-2xl flex items-center justify-center text-primary print:text-black font-extrabold text-sm border border-primary/20">
                              {tenantCode === "PNG" ? "PNG" : "SSD"}
                            </div>
                          )}
                          <div>
                            <h2 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider print:text-black leading-none">
                              {(tenantCode === "ZMB" || tenant?.name?.toLowerCase().includes("zambia") || tenant?.code?.toLowerCase().includes("zmb"))
                                ? "Republic of Zambia"
                                : tenantCode === "PNG"
                                ? "Independent State of PNG"
                                : "Republic of South Sudan"}
                            </h2>
                            <h3 className="text-sm font-black text-foreground dark:text-white uppercase tracking-tight print:text-black mt-1">
                              Ministry of Health
                            </h3>
                            <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-wider mt-0.5 print:text-black">
                              Child Immunization Booklet
                            </p>
                          </div>
                        </div>
 
                        {/* Digital Authenticity Verification QR Code */}
                        <div className="flex flex-col items-center justify-center border border-slate-200 p-1 bg-white rounded-xl shrink-0 shadow-xs print:border-black">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                              window.location.origin + `/clients?verify=${selectedClient.id}`
                            )}`} 
                            alt="Verification QR Code" 
                            className="w-12 h-12 rounded-lg"
                          />
                          <span className="text-[6px] text-slate-500 font-mono tracking-tighter mt-1 block">SCAN TO VERIFY</span>
                        </div>
                      </div>

                      {/* Demographics details */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-100/50 dark:bg-slate-800/40 p-2.5 border border-slate-200/50 dark:border-white/5 rounded-xl print:bg-none print:border-black">
                            <span className="text-[9px] text-muted-foreground block font-bold uppercase tracking-wider">Child Full Name</span>
                            <span className="font-extrabold text-foreground dark:text-white text-xs block mt-0.5">{selectedClient.name}</span>
                          </div>
                          <div className="bg-slate-100/50 dark:bg-slate-800/40 p-2.5 border border-slate-200/50 dark:border-white/5 rounded-xl print:bg-none print:border-black">
                            <span className="text-[9px] text-muted-foreground block font-bold uppercase tracking-wider">Date of Birth (DOB)</span>
                            <span className="font-bold text-foreground dark:text-white block mt-0.5">{new Date(selectedClient.dateOfBirth).toLocaleDateString()}</span>
                          </div>
                          <div className="bg-slate-100/50 dark:bg-slate-800/40 p-2.5 border border-slate-200/50 dark:border-white/5 rounded-xl print:bg-none print:border-black">
                            <span className="text-[9px] text-muted-foreground block font-bold uppercase tracking-wider">Gender / Sex</span>
                            <span className="font-semibold text-foreground dark:text-white capitalize block mt-0.5">{selectedClient.gender || "N/A"}</span>
                          </div>
                          <div className="bg-slate-100/50 dark:bg-slate-800/40 p-2.5 border border-slate-200/50 dark:border-white/5 rounded-xl print:bg-none print:border-black">
                            <span className="text-[9px] text-muted-foreground block font-bold uppercase tracking-wider">Mother/Guardian Name</span>
                            <span className="font-semibold text-foreground dark:text-white block mt-0.5">{selectedClient.parentName || "Not registered"}</span>
                          </div>
                          <div className="bg-slate-100/50 dark:bg-slate-800/40 p-2.5 border border-slate-200/50 dark:border-white/5 rounded-xl col-span-2 print:bg-none print:border-black">
                            <span className="text-[9px] text-muted-foreground block font-bold uppercase tracking-wider">Guardian Contact Phone</span>
                            <span className="font-mono font-semibold text-foreground dark:text-white block mt-0.5">{selectedClient.contactPhone || "None"}</span>
                          </div>
                        </div>

                        {/* Residency / Cross-border Context */}
                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/20 text-xs space-y-1.5 print:bg-none print:border-black">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Geographic Access Scope</span>
                          {!selectedClient.isCrossBorder ? (
                            <>
                              <p className="text-foreground dark:text-slate-200"><strong>Village Catchment:</strong> {getVillageName(selectedClient.villageId)}</p>
                              <p className="text-[10px] text-muted-foreground"><strong>Hierarchy Trace:</strong> {getVillageResidencyPath(selectedClient.villageId) || "Local catchments"}</p>
                              <p className="text-foreground dark:text-slate-200"><strong>Registered Clinic:</strong> {getFacilityName(selectedClient.facilityId)}</p>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-between border-b pb-1.5 mb-1.5 border-slate-200 dark:border-white/5">
                                <span className="font-bold text-sky-600 dark:text-sky-400">Cross-Border / Foreign Resident</span>
                                <Badge className="bg-sky-500/10 text-sky-600 border-none text-[8px] font-extrabold uppercase rounded-lg">OVERSEAS</Badge>
                              </div>
                              <p className="text-foreground dark:text-slate-200"><strong>Country of Origin:</strong> {selectedClient.countryOfOrigin}</p>
                              <p className="text-foreground dark:text-slate-200"><strong>Border Point of Entry:</strong> {selectedClient.borderPointOfEntry || "N/A"}</p>
                              <p className="italic text-muted-foreground text-[11px]"><strong>Foreign Residence:</strong> {selectedClient.foreignResidence || "N/A"}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Health Warning & Advisories */}
                    <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/5 print:border-black">
                      {(selectedClient.isRefusal || (Array.isArray(selectedClient.contraindications) && selectedClient.contraindications.length > 0)) ? (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl text-[10px] space-y-1 font-semibold print:border-black">
                          <p className="font-bold flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> CLINICAL RISK FLAGS</p>
                          {selectedClient.isRefusal && <p>• Family refuses vaccines: {selectedClient.refusalReason}</p>}
                          {Array.isArray(selectedClient.contraindications) && selectedClient.contraindications.length > 0 && (
                            <p>• Contraindications: {selectedClient.contraindications.join(", ")}</p>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-[10px] flex items-start gap-2.5 print:border-black">
                          <Heart className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                          <div>
                            <p className="font-bold uppercase tracking-wide">Clinician Instruction</p>
                            <p className="text-muted-foreground/80 dark:text-slate-400/90 font-normal mt-0.5 leading-relaxed">Ensure parents complete the schedule sessions. Verify subsequent visits and stamp the grid accordingly.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Printer Clinician Verification Block */}
                    <div className="hidden print:flex items-center justify-between border-t pt-4 border-black text-[9px] mt-4">
                      <span><strong>Clinician Signature:</strong> _______________________</span>
                      <span><strong>Verification Date:</strong> _______________________</span>
                    </div>
                  </div>

                  {/* SIDE B: CHILD HEALTH CARD BACK */}
                  <div className="relative border rounded-3xl p-6 bg-white dark:bg-slate-900/20 shadow-lg border-slate-200/80 dark:border-white/5 flex flex-col justify-between min-h-[500px] print-card-side">
                    {/* Security Crest Watermark */}
                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.01] pointer-events-none flex items-center justify-center print:opacity-[0.02]">
                      <Layers className="h-72 w-72" />
                    </div>

                    <div>
                      <h3 className="text-xs font-black uppercase tracking-tight flex items-center gap-2 border-b pb-3 mb-4 border-slate-200 dark:border-white/5 print:border-black">
                        <BadgeCheck className="h-4 w-4 text-indigo-500" />
                        Immunization Schedule & Dose Grid
                      </h3>

                      {/* Schedule Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-[9px] text-left border-collapse">
                          <thead>
                            <tr className="border-b text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider pb-1.5 print:border-black print:text-black">
                              <th className="py-1.5 px-1">Antigen Dose</th>
                              <th className="py-1.5 px-1 text-center">Target</th>
                              <th className="py-1.5 px-1 text-center">Status</th>
                              <th className="py-1.5 px-1">Given Date / Clinic</th>
                              <th className="py-1.5 px-1">Batch / VVM</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5 print:divide-black">
                            {VACCINE_SCHEDULE.map((dose, idx) => {
                              const res = getDoseStatus(dose);
                              return (
                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 print:hover:bg-transparent">
                                  <td className="py-1.5 px-1 font-bold text-slate-800 dark:text-slate-200">{dose.name}</td>
                                  <td className="py-1.5 px-1 text-center font-medium text-slate-500">{dose.group}</td>
                                  <td className="py-1.5 px-1 text-center">
                                    {res.status === "administered" ? (
                                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-bold py-0.5 px-1.5 text-[8px] uppercase tracking-wide rounded-md">
                                        GIVEN
                                      </Badge>
                                    ) : res.status === "overdue" ? (
                                      <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-none font-bold py-0.5 px-1.5 text-[8px] uppercase tracking-wide rounded-md flex items-center gap-0.5 justify-center">
                                        <AlertTriangle className="h-2 w-2 shrink-0 text-rose-500" /> DUE
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-slate-400 border-slate-200 dark:border-white/5 font-medium py-0.5 px-1.5 text-[8px] uppercase tracking-wide rounded-md">
                                        PENDING
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-1">
                                    {res.status === "administered" ? (
                                      <div className="leading-tight">
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{res.date}</span>
                                        <span className="block text-[7px] text-muted-foreground truncate max-w-[100px]">{res.facility}</span>
                                      </div>
                                    ) : res.status === "overdue" ? (
                                      <div className="leading-tight text-rose-600 dark:text-rose-400">
                                        <span className="font-bold">Due: {res.dueDate}</span>
                                        <span className="block text-[7px]">({res.weeksOverdue}w overdue)</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 dark:text-slate-500 font-medium">Due: {res.dueDate}</span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-1 font-mono text-slate-600 dark:text-slate-400">
                                    {res.status === "administered" ? (
                                      <div className="leading-tight text-[8px]">
                                        <span>#{res.record.batchNumber}</span>
                                        <span className="block text-[7px] text-muted-foreground">VVM: {res.record.vvmStatus}</span>
                                      </div>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Summary appointments */}
                    <div className="border-t pt-3 mt-3 border-slate-200 dark:border-white/5 print:border-black flex justify-between items-center text-[9px] text-muted-foreground font-semibold uppercase tracking-wider print:text-black">
                      <span>EPI Certified Registry Card</span>
                      <span>Next Visit: ________________</span>
                    </div>
                  </div>
                </div>

                {/* Print and interaction controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border no-print">
                  {/* Guardian Notifications Dispatches */}
                  <div className="flex items-center gap-1.5 bg-secondary/50 dark:bg-slate-800/40 p-1 rounded-xl border border-border/80">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">Notify Guardian</span>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setShareMethod("email");
                        // Prefill email
                        setShareInput(selectedClient.parentName ? `${selectedClient.parentName.toLowerCase().replace(/\s+/g, '')}@health.gov` : "");
                        setIsShareOpen(true);
                      }}
                      className={`h-8 px-2.5 text-xs rounded-lg gap-1 border border-transparent hover:bg-background ${
                        shareMethod === "email" ? "bg-background border-border text-primary font-bold shadow-xs" : "text-muted-foreground"
                      }`}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Email</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setShareMethod("sms");
                        // Prefill phone
                        setShareInput(selectedClient.contactPhone || "");
                        setIsShareOpen(true);
                      }}
                      className={`h-8 px-2.5 text-xs rounded-lg gap-1 border border-transparent hover:bg-background ${
                        shareMethod === "sms" ? "bg-background border-border text-primary font-bold shadow-xs" : "text-muted-foreground"
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>SMS</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setShareMethod("whatsapp");
                        // Prefill phone
                        setShareInput(selectedClient.contactPhone || "");
                        setIsShareOpen(true);
                      }}
                      className={`h-8 px-2.5 text-xs rounded-lg gap-1 border border-transparent hover:bg-background ${
                        shareMethod === "whatsapp" ? "bg-background border-border text-primary font-bold shadow-xs" : "text-muted-foreground"
                      }`}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>WhatsApp</span>
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setIsEditClientOpen(true);
                        editForm.reset({
                          name: selectedClient.name,
                          clientType: selectedClient.clientType,
                          dateOfBirth: selectedClient.dateOfBirth ? new Date(selectedClient.dateOfBirth).toISOString().split("T")[0] : "",
                          gender: selectedClient.gender || "male",
                          parentName: selectedClient.parentName || "",
                          contactPhone: selectedClient.contactPhone || "",
                          catchmentStatus: selectedClient.catchmentStatus || "catchment",
                          isRefusal: selectedClient.isRefusal || false,
                          refusalReason: selectedClient.refusalReason || "",
                          contraindications: Array.isArray(selectedClient.contraindications) ? (selectedClient.contraindications as string[]) : [],
                          isCrossBorder: selectedClient.isCrossBorder || false,
                          countryOfOrigin: selectedClient.countryOfOrigin || "",
                          borderPointOfEntry: selectedClient.borderPointOfEntry || "",
                          foreignResidence: selectedClient.foreignResidence || "",
                          justification: "",
                        });
                        if (user?.role === "national_admin") {
                          setAdminFacilityId(selectedClient.facilityId);
                          const fac = facilities?.find((f) => f.id === selectedClient.facilityId);
                          if (fac) {
                            setAdminDistrictId(fac.districtId);
                            const dist = districts?.find((d) => d.id === fac.districtId);
                            if (dist) {
                              setAdminProvinceId(dist.provinceId);
                            }
                          }
                        }
                      }}
                      className="gap-1.5 shadow-lg shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl"
                    >
                      <PenLine className="h-4 w-4" /> Edit Profile
                    </Button>
                    <Button 
                      onClick={() => window.print()} 
                      className="gap-1.5 shadow-lg shadow-sky-500/20 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs rounded-xl"
                    >
                      <Printer className="h-4 w-4" /> Print Booklet
                    </Button>
                    <Button
                      onClick={() => {
                        setVaccinateClient(selectedClient);
                        setIsVaccinateOpen(true);
                        vaccinationForm.reset({
                          vaccineConfigId: 0,
                          vaccineName: "",
                          administeredDate: new Date().toISOString().split("T")[0],
                          expiryDate: "",
                          batchNumber: "",
                          vvmStatus: "1",
                        });
                      }}
                      className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
                    >
                      <Syringe className="h-4 w-4" />
                      Log Antigen
                    </Button>
                    <Button variant="outline" onClick={() => setIsTimelineOpen(false)} className="text-xs rounded-xl">
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

