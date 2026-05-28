import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import type { Tenant } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from "xlsx";
// Original Code: Standard lucide-react imports without upload and extraction icons
/*
import {
  User,
  Bell,
  Shield,
  Database,
  Download,
  Smartphone,
  Globe,
  Settings as SettingsIcon,
} from "lucide-react";
*/

import {
  User,
  Bell,
  Shield,
  Database,
  Download,
  Smartphone,
  Globe,
  Settings as SettingsIcon,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Map,
  Plus,
  Users,
  UserPlus
} from "lucide-react";
import UserManagement from "./UserManagement";
import SignupRequests from "./SignupRequests";
import CountryOnboarding from "./CountryOnboarding";
import BoundaryManager from "./BoundaryManager";
import { WastageThresholdsCard } from "@/components/WastageThresholdsCard";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isNationalAdmin = user?.role === "national_admin";
  const canAccessUserManagement = isNationalAdmin || user?.role === "provincial_coordinator";

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/me/tenant"],
    retry: false,
  });

  const [births, setBirths] = useState("3.2");
  const [under1, setUnder1] = useState("3.0");
  const [pregnant, setPregnant] = useState("3.2");
  const [schoolEntry, setSchoolEntry] = useState("2.7");
  const [currencyCode, setCurrencyCode] = useState("PGK");
  const [currencySymbol, setCurrencySymbol] = useState("K");
  const [lat, setLat] = useState("-6.0");
  const [lng, setLng] = useState("145.0");
  const [zoom, setZoom] = useState("6");
  const [maxApprovalLevel, setMaxApprovalLevel] = useState("national");
  const [offlineStaleHours, setOfflineStaleHours] = useState("2");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vaxplan_offline_stale_hours");
      if (saved) setOfflineStaleHours(saved);
    }
  }, []);

  // Seeding & Import States
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importResults, setImportResults] = useState<{ success: boolean; count?: number; message?: string } | null>(null);

  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionStage, setExtractionStage] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [extractionDuration, setExtractionDuration] = useState("");

  // Upgraded Population Seeding States
  const [isImportingPop, setIsImportingPop] = useState(false);
  const [dragActivePop, setDragActivePop] = useState(false);
  const [popUploadProgress, setPopUploadProgress] = useState(0);
  const [popResults, setPopResults] = useState<{ success: boolean; created?: number; updated?: number; message?: string } | null>(null);

  // Upgraded Facilities Seeding States
  const [isImportingFac, setIsImportingFac] = useState(false);
  const [dragActiveFac, setDragActiveFac] = useState(false);
  const [facResults, setFacResults] = useState<{ success: boolean; created?: number; updated?: number; message?: string } | null>(null);

  // Upgraded Villages Seeding States
  const [isImportingVil, setIsImportingVil] = useState(false);
  const [dragActiveVil, setDragActiveVil] = useState(false);
  const [vilResults, setVilResults] = useState<{ success: boolean; created?: number; updated?: number; message?: string } | null>(null);

  // Utility to parse sheets client-side to JSON array
  const parseSheetToJSON = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  // Facilities Import Handler
  const importFacilities = async (file: File) => {
    setIsImportingFac(true);
    setFacResults(null);
    try {
      const json = await parseSheetToJSON(file);
      if (!Array.isArray(json) || json.length === 0) {
        throw new Error("Spreadsheet is empty or invalid.");
      }

      const mapped = json.map((row: any) => {
        const findKey = (candidates: string[]) => {
          const match = Object.keys(row).find(k => candidates.includes(k.toLowerCase().trim().replace(/["']/g, "")));
          return match ? row[match] : null;
        };

        const name = findKey(["name", "facility_name", "facility", "hf_name", "hf"]);
        const hmisCode = findKey(["hmiscode", "hmis_code", "code", "facilitycode", "facility_code"]);
        const facilityType = findKey(["type", "facilitytype", "facility_type", "level"]);
        const agencyName = findKey(["agency", "agencyname", "agency_name", "operator"]);
        const operationalStatus = findKey(["status", "operationalstatus", "operational_status", "active"]);
        const districtName = findKey(["district", "districtname", "district_name"]);
        const latitude = findKey(["latitude", "lat", "y"]);
        const longitude = findKey(["longitude", "lng", "lon", "x"]);
        const address = findKey(["address", "location"]);
        const contactPhone = findKey(["phone", "contact", "phone_number"]);
        const operatingHours = findKey(["hours", "operating_hours"]);
        const hasRefrigerator = findKey(["refrigerator", "hasrefrigerator", "has_refrigerator", "cold_chain"]);
        const hasPower = findKey(["power", "haspower", "has_power", "electricity"]);
        const staffCount = findKey(["staff", "staffcount", "staff_count", "workers"]);
        const catchmentRadius = findKey(["radius", "catchmentradius", "catchment_radius"]);

        if (!name || !hmisCode) {
          throw new Error("Mandatory fields 'Name' and 'HMIS Code' are missing in some rows.");
        }

        return {
          name: String(name),
          hmisCode: String(hmisCode),
          facilityType: facilityType ? String(facilityType) : null,
          agencyName: agencyName ? String(agencyName) : null,
          operationalStatus: operationalStatus ? String(operationalStatus) : null,
          districtName: districtName ? String(districtName) : null,
          latitude: latitude !== null && latitude !== undefined && String(latitude).trim() !== "" ? Number(latitude) : null,
          longitude: longitude !== null && longitude !== undefined && String(longitude).trim() !== "" ? Number(longitude) : null,
          address: address ? String(address) : null,
          contactPhone: contactPhone ? String(contactPhone) : null,
          operatingHours: operatingHours ? String(operatingHours) : null,
          hasRefrigerator: hasRefrigerator ? ["true", "1", "yes", "t", "y"].includes(String(hasRefrigerator).toLowerCase()) : false,
          hasPower: hasPower ? ["true", "1", "yes", "t", "y"].includes(String(hasPower).toLowerCase()) : false,
          staffCount: staffCount !== null && staffCount !== undefined && String(staffCount).trim() !== "" ? Number(staffCount) : null,
          catchmentRadius: catchmentRadius !== null && catchmentRadius !== undefined && String(catchmentRadius).trim() !== "" ? Number(catchmentRadius) : null,
        };
      });

      const res = await apiRequest<{ success: boolean; createdCount: number; updatedCount: number }>(
        "POST",
        "/api/facilities/import",
        { facilities: mapped }
      );

      toast({
        title: "Facilities Seeding Complete",
        description: `Successfully processed ${mapped.length} records. Added: ${res.createdCount}, Updated: ${res.updatedCount}.`,
      });

      setFacResults({
        success: true,
        created: res.createdCount,
        updated: res.updatedCount,
        message: `Seeded ${mapped.length} rows. Added ${res.createdCount} new facilities, updated ${res.updatedCount} existing entries without duplicate data.`
      });

      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Facilities Seeding Failed",
        description: err.message || "Failed to parse facilities file.",
        variant: "destructive"
      });
      setFacResults({
        success: false,
        message: err.message || "Failed to parse and process facilities registry file."
      });
    } finally {
      setIsImportingFac(false);
    }
  };

  // Villages Import Handler
  const importVillages = async (file: File) => {
    setIsImportingVil(true);
    setVilResults(null);
    try {
      const json = await parseSheetToJSON(file);
      if (!Array.isArray(json) || json.length === 0) {
        throw new Error("Spreadsheet is empty or invalid.");
      }

      const mapped = json.map((row: any) => {
        const findKey = (candidates: string[]) => {
          const match = Object.keys(row).find(k => candidates.includes(k.toLowerCase().trim().replace(/["']/g, "")));
          return match ? row[match] : null;
        };

        const name = findKey(["name", "village", "community", "settlement", "village_name", "villagename"]);
        const code = findKey(["code", "villagecode", "village_code", "settlementcode", "settlement_code", "id"]);
        const districtName = findKey(["district", "districtname", "district_name"]);
        const isHardToReach = findKey(["hard_to_reach", "hardtoreach", "htr", "is_hard_to_reach"]);
        const latitude = findKey(["latitude", "lat", "y"]);
        const longitude = findKey(["longitude", "lng", "lon", "x"]);
        const facilityHmisCode = findKey(["facility_hmis_code", "facilityhmiscode", "hmiscode", "facility_code", "facility_id"]);
        const comments = findKey(["comments", "remarks", "notes"]);
        const insecurityLevel = findKey(["insecurity", "insecurity_level", "risk"]);

        if (!name) {
          throw new Error("Mandatory field 'Name' is missing in some rows.");
        }

        return {
          name: String(name),
          code: code ? String(code) : null,
          districtName: districtName ? String(districtName) : null,
          isHardToReach: isHardToReach ? ["true", "1", "yes", "htr", "t", "y"].includes(String(isHardToReach).toLowerCase()) : false,
          latitude: latitude !== null && latitude !== undefined && String(latitude).trim() !== "" ? Number(latitude) : null,
          longitude: longitude !== null && longitude !== undefined && String(longitude).trim() !== "" ? Number(longitude) : null,
          facilityHmisCode: facilityHmisCode ? String(facilityHmisCode) : null,
          comments: comments ? String(comments) : null,
          insecurityLevel: insecurityLevel !== null && insecurityLevel !== undefined && String(insecurityLevel).trim() !== "" ? Number(insecurityLevel) : null,
        };
      });

      const res = await apiRequest<{ success: boolean; createdCount: number; updatedCount: number }>(
        "POST",
        "/api/villages/import",
        { villages: mapped }
      );

      toast({
        title: "Communities Seeding Complete",
        description: `Successfully processed ${mapped.length} records. Added: ${res.createdCount}, Updated: ${res.updatedCount}.`,
      });

      setVilResults({
        success: true,
        created: res.createdCount,
        updated: res.updatedCount,
        message: `Seeded ${mapped.length} rows. Added ${res.createdCount} new villages, updated ${res.updatedCount} existing village registry entries.`
      });

      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Communities Seeding Failed",
        description: err.message || "Failed to parse communities file.",
        variant: "destructive"
      });
      setVilResults({
        success: false,
        message: err.message || "Failed to parse and process village registry file."
      });
    } finally {
      setIsImportingVil(false);
    }
  };

  // Population Data Import Handler
  const importPopulation = async (file: File) => {
    setIsImportingPop(true);
    setPopResults(null);
    try {
      const json = await parseSheetToJSON(file);
      if (!Array.isArray(json) || json.length === 0) {
        throw new Error("Spreadsheet is empty or invalid.");
      }

      const mapped = json.map((row: any) => {
        const findKey = (candidates: string[]) => {
          const match = Object.keys(row).find(k => candidates.includes(k.toLowerCase().trim().replace(/["']/g, "")));
          return match ? row[match] : null;
        };

        const villageName = findKey(["village", "villagename", "village_name", "community"]);
        const villageCode = findKey(["villagecode", "village_code", "code"]);
        const facilityHmisCode = findKey(["facility_hmis_code", "facilityhmiscode", "hmiscode", "facilitycode"]);
        const facilityName = findKey(["facility", "facilityname", "facility_name"]);
        const source = findKey(["source", "populationsource", "data_source"]) || "community_census";
        const year = findKey(["year", "census_year"]) || 2026;
        const totalPopulation = findKey(["total_population", "population", "total", "pop"]);
        const malePopulation = findKey(["male", "male_population", "males"]);
        const femalePopulation = findKey(["female", "female_population", "females"]);
        const under1Population = findKey(["under1", "under_1", "infants"]);
        const under5Population = findKey(["under5", "under_5", "children"]);
        const pregnantWomen = findKey(["pregnant", "pregnant_women", "maternal"]);
        const schoolEntry = findKey(["schoolentry", "school_entry"]);
        const schoolExit = findKey(["schoolexit", "school_exit"]);
        const growthRate = findKey(["growth", "growthrate", "growth_rate"]);
        const confidenceScore = findKey(["confidence", "confidencescore", "confidence_score"]);

        if (!totalPopulation) {
          throw new Error("Mandatory field 'Total Population' is missing in some rows.");
        }

        const validSources = ["nso", "hmis", "worldpop", "survey", "community_census"];
        const normSource = String(source).toLowerCase().replace(/[\s_]+/g, "_");
        const finalSource = validSources.includes(normSource) ? normSource : "community_census";

        return {
          villageName: villageName ? String(villageName) : null,
          villageCode: villageCode ? String(villageCode) : null,
          facilityHmisCode: facilityHmisCode ? String(facilityHmisCode) : null,
          facilityName: facilityName ? String(facilityName) : null,
          source: finalSource,
          year: Number(year),
          totalPopulation: Number(totalPopulation),
          malePopulation: malePopulation !== null && malePopulation !== undefined && String(malePopulation).trim() !== "" ? Number(malePopulation) : null,
          femalePopulation: femalePopulation !== null && femalePopulation !== undefined && String(femalePopulation).trim() !== "" ? Number(femalePopulation) : null,
          under1Population: under1Population !== null && under1Population !== undefined && String(under1Population).trim() !== "" ? Number(under1Population) : null,
          under5Population: under5Population !== null && under5Population !== undefined && String(under5Population).trim() !== "" ? Number(under5Population) : null,
          pregnantWomen: pregnantWomen !== null && pregnantWomen !== undefined && String(pregnantWomen).trim() !== "" ? Number(pregnantWomen) : null,
          schoolEntry: schoolEntry !== null && schoolEntry !== undefined && String(schoolEntry).trim() !== "" ? Number(schoolEntry) : null,
          schoolExit: schoolExit !== null && schoolExit !== undefined && String(schoolExit).trim() !== "" ? Number(schoolExit) : null,
          growthRate: growthRate !== null && growthRate !== undefined && String(growthRate).trim() !== "" ? Number(growthRate) : null,
          confidenceScore: confidenceScore !== null && confidenceScore !== undefined && String(confidenceScore).trim() !== "" ? Number(confidenceScore) : null,
        };
      });

      const res = await apiRequest<{ success: boolean; createdCount: number; updatedCount: number }>(
        "POST",
        "/api/population/import",
        { population: mapped }
      );

      toast({
        title: "Population Seeding Complete",
        description: `Successfully processed ${mapped.length} records. Added: ${res.createdCount}, Updated: ${res.updatedCount}.`,
      });

      setPopResults({
        success: true,
        created: res.createdCount,
        updated: res.updatedCount,
        message: `Seeded ${mapped.length} rows. Added ${res.createdCount} new population registries, updated ${res.updatedCount} existing records.`
      });

      queryClient.invalidateQueries({ queryKey: ["/api/population"] });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Population Seeding Failed",
        description: err.message || "Failed to parse population file.",
        variant: "destructive"
      });
      setPopResults({
        success: false,
        message: err.message || "Failed to parse and process population registry file."
      });
    } finally {
      setIsImportingPop(false);
    }
  };

  // Direct GeoTIFF population raster upload stream
  const uploadGeoTiff = async (file: File) => {
    setIsImportingPop(true);
    setPopUploadProgress(0);
    setPopResults(null);
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/resources/geotiff/upload");
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.setRequestHeader("x-file-name", file.name);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setPopUploadProgress(progress);
        }
      };

      const uploadPromise = new Promise<{ success: boolean; message: string }>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              resolve(res);
            } catch {
              resolve({ success: true, message: "Raster uploaded successfully." });
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              reject(new Error(res.message || "Upload failed."));
            } catch {
              reject(new Error(`Upload failed with status code ${xhr.status}.`));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network upload error occurred."));
      });

      xhr.send(file);
      const data = await uploadPromise;

      toast({
        title: "Population Raster Upload Complete",
        description: `Successfully saved ${file.name} to gridded population pool.`,
      });

      setPopResults({
        success: true,
        message: `Successfully uploaded and streamed ${file.name} population GeoTIFF raster file directly to the Resources directory.`
      });

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Raster Upload Failed",
        description: err.message || "Failed to stream population GeoTIFF raster.",
        variant: "destructive"
      });
      setPopResults({
        success: false,
        message: err.message || "Failed to stream population GeoTIFF raster."
      });
    } finally {
      setIsImportingPop(false);
      setPopUploadProgress(0);
    }
  };

  // Population drag-and-drop handlers
  const handleDragPop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActivePop(true);
    else if (e.type === "dragleave") setDragActivePop(false);
  };
  const handleDropPop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActivePop(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".tif") || file.name.endsWith(".tiff")) {
        uploadGeoTiff(file);
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
        importPopulation(file);
      } else {
        toast({ title: "Unsupported File Type", description: "Upload .tif/.tiff for rasters, or .xlsx/.xls/.csv for spreadsheets.", variant: "destructive" });
      }
    }
  };
  const handleFileInputPop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith(".tif") || file.name.endsWith(".tiff")) {
        uploadGeoTiff(file);
      } else {
        importPopulation(file);
      }
    }
  };

  // Facilities drag-and-drop handlers
  const handleDragFac = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActiveFac(true);
    else if (e.type === "dragleave") setDragActiveFac(false);
  };
  const handleDropFac = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActiveFac(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      importFacilities(file);
    }
  };
  const handleFileInputFac = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      importFacilities(e.target.files[0]);
    }
  };

  // Villages drag-and-drop handlers
  const handleDragVil = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActiveVil(true);
    else if (e.type === "dragleave") setDragActiveVil(false);
  };
  const handleDropVil = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActiveVil(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      importVillages(file);
    }
  };
  const handleFileInputVil = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      importVillages(e.target.files[0]);
    }
  };

  // Trigger Boundary extraction from seeded polygons
  const handleExtractBoundaries = async () => {
    setIsExtracting(true);
    setExtractionProgress(0);
    setExtractionStage("Loading boundary GeoJSON polygons...");
    setImportResults(null);
    setShowReport(false);
    setExtractionDuration("");

    const startTime = Date.now();
    
    // Poll the backend extraction progress endpoint
    const pollProgress = async () => {
      try {
        const res = await fetch("/api/villages/extract/progress");
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            const progress = Math.round((data.current / data.total) * 100);
            setExtractionProgress(progress);
            setExtractionStage(data.stage);
          }
        }
      } catch (e) {
        console.error("Progress polling error:", e);
      }
    };

    const progressInterval = setInterval(pollProgress, 300);

    try {
      // Type-safe apiRequest call that directly returns the parsed JSON response object
      const data = await apiRequest<{ success: boolean; count: number }>("POST", "/api/villages/extract");
      
      clearInterval(progressInterval);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      setExtractionDuration(elapsed);
      setExtractionProgress(100);
      setExtractionStage("Centroid extraction successfully completed!");
      
      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });
      
      toast({
        title: "Map Extraction Complete",
        description: `Successfully computed centroids from active boundaries and seeded ${data.count || 0} villages.`,
      });
      
      setImportResults({
        success: true,
        count: data.count,
        message: `Successfully seeded ${data.count} community centroids from boundary map layer.`
      });
      setShowReport(true);
    } catch (err: any) {
      clearInterval(progressInterval);
      setExtractionProgress(0);
      setExtractionStage("");
      toast({
        title: "Map Extraction Failed",
        description: err.message || "Could not extract villages from boundaries.",
        variant: "destructive",
      });
      setImportResults({
        success: false,
        message: err.message || "Failed to extract centroids from map boundaries."
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Name,Latitude,Longitude,HardToReach,DistrictName\nOutreach Camp A,-15.42105,28.29341,true,Zambezi\nVillage Community B,-15.49812,28.31204,false,Zambezi\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "community_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Template Downloaded",
      description: "Standard community import template CSV downloaded successfully.",
    });
  };

  // Robust CSV Line Parser supporting quotes and comma escapes
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Parse CSV Text & import into backend
  const parseCSVAndImport = async (csvText: string) => {
    setIsImporting(true);
    setImportResults(null);
    try {
      const lines = csvText.split(/\r?\n/);
      if (lines.length < 2) {
        throw new Error("CSV file is empty or missing headers.");
      }

      // Read and map headers
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/["']/g, "").trim());
      
      const nameIdx = headers.findIndex(h => h === "name" || h === "village" || h === "community" || h === "settlement");
      const latIdx = headers.findIndex(h => h === "latitude" || h === "lat" || h === "y");
      const lngIdx = headers.findIndex(h => h === "longitude" || h === "lng" || h === "lon" || h === "x");
      const htrIdx = headers.findIndex(h => h === "hard_to_reach" || h === "hardtoreach" || h === "htr" || h === "is_hard_to_reach");
      const districtIdx = headers.findIndex(h => h === "district" || h === "district_name" || h === "districtname");

      if (nameIdx === -1) {
        throw new Error("Invalid CSV format: Must contain a 'Name' or 'Village' column.");
      }

      const parsedVillages = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = parseCSVLine(lines[i]);
        const name = cols[nameIdx]?.replace(/["']/g, "").trim();
        if (!name) continue;

        const latitude = latIdx !== -1 && cols[latIdx] ? cols[latIdx].trim() : null;
        const longitude = lngIdx !== -1 && cols[lngIdx] ? cols[lngIdx].trim() : null;
        const isHardToReach = htrIdx !== -1 && cols[htrIdx]
          ? ["true", "1", "yes", "htr"].includes(cols[htrIdx].toLowerCase().trim())
          : false;
        const districtName = districtIdx !== -1 && cols[districtIdx] ? cols[districtIdx].trim() : null;

        parsedVillages.push({
          name,
          latitude: latitude && latitude !== "" ? latitude : null,
          longitude: longitude && longitude !== "" ? longitude : null,
          isHardToReach,
          districtName: districtName && districtName !== "" ? districtName : null
        });
      }

      if (parsedVillages.length === 0) {
        throw new Error("No valid rows containing village names were found in the CSV.");
      }

      // Original Code: Untyped apiRequest and unnecessary res.json() call, causing compile check errors
      /*
      const res = await apiRequest("POST", "/api/villages/import", parsedVillages);
      const data = await res.json();
      */
      // Updated Code: Type-safe apiRequest call that directly returns the parsed JSON response object
      const data = await apiRequest<{ success: boolean; count: number }>("POST", "/api/villages/import", parsedVillages);

      queryClient.invalidateQueries({ queryKey: ["/api/villages"] });

      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.count} villages/communities into your active registry.`,
      });

      setImportResults({
        success: true,
        count: data.count,
        message: `Successfully imported ${data.count} communities from CSV file.`
      });
    } catch (err: any) {
      toast({
        title: "CSV Import Failed",
        description: err.message || "Failed to parse and import CSV file.",
        variant: "destructive",
      });
      setImportResults({
        success: false,
        message: err.message || "Failed to process the uploaded CSV file."
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Drag & Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".csv")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            parseCSVAndImport(event.target.result as string);
          }
        };
        reader.readAsText(file);
      } else {
        toast({
          title: "Unsupported File Type",
          description: "Please upload a valid .csv file.",
          variant: "destructive"
        });
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          parseCSVAndImport(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (tenant?.settings) {
      const s = tenant.settings as Record<string, any>;
      if (s.demographics) {
        setBirths(((s.demographics.births || 0) * 100).toFixed(1));
        setUnder1(((s.demographics.under1 || 0) * 100).toFixed(1));
        setPregnant(((s.demographics.pregnant || 0) * 100).toFixed(1));
        setSchoolEntry(((s.demographics.schoolEntry || 0) * 100).toFixed(1));
      }
      setCurrencyCode(s.currency || "PGK");
      setCurrencySymbol(s.currencySymbol || "K");
      setMaxApprovalLevel(s.maxApprovalLevel || "national");
      if (s.mapCenter) {
        setLat(String(s.mapCenter[0]));
        setLng(String(s.mapCenter[1]));
      }
      setZoom(String(s.mapZoom || "6"));
    }
  }, [tenant]);

  const updateSettings = useMutation({
    mutationFn: async (updatedFields: Partial<Tenant>) => {
      const response = await apiRequest("PATCH", "/api/me/tenant", updatedFields);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/tenant"] });
      toast({
        title: "Configuration Saved",
        description: "Dynamic microplanning country settings updated successfully.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to save configuration",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveCountrySettings = () => {
    const s = (tenant?.settings || {}) as Record<string, any>;
    const updatedSettings = {
      ...s,
      currency: currencyCode,
      currencySymbol: currencySymbol,
      maxApprovalLevel: maxApprovalLevel,
      mapCenter: [parseFloat(lat) || -6.0, parseFloat(lng) || 145.0],
      mapZoom: parseInt(zoom) || 6,
      demographics: {
        births: (parseFloat(births) || 3.2) / 100,
        under1: (parseFloat(under1) || 3.0) / 100,
        pregnant: (parseFloat(pregnant) || 3.2) / 100,
        schoolEntry: (parseFloat(schoolEntry) || 2.7) / 100,
        schoolExit: s.demographics?.schoolExit || 0.022,
      }
    };
    updateSettings.mutate({
      settings: updatedSettings
    });
  };

  const modules = (tenant?.settings as any)?.modules || {
    budget: true,
    calculator: true,
    stock: true,
    mobilization: true,
    htr: true,
    interop: true,
  };

  const toggleModule = (key: string) => {
    const updatedSettings = {
      ...(tenant?.settings as any),
      modules: {
        ...modules,
        [key]: !modules[key],
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
  };

  const DEFAULT_PERMISSIONS = {
    facility_clerk: ["view_demographics", "log_immunizations", "create_session_plans"],
    facility_in_charge: ["view_demographics", "log_immunizations", "create_session_plans", "approve_session_plans"],
    district_manager: ["view_demographics", "approve_session_plans", "manage_facilities"],
    provincial_coordinator: ["view_demographics", "approve_session_plans", "manage_facilities"],
    national_admin: ["view_demographics", "log_immunizations", "create_session_plans", "approve_session_plans", "manage_facilities", "manage_settings"],
  };

  const rbac = (tenant?.settings as any)?.rbac || DEFAULT_PERMISSIONS;

  const togglePermission = (role: string, gate: string) => {
    const currentGates = rbac[role] || [];
    const updatedGates = currentGates.includes(gate)
      ? currentGates.filter((g: string) => g !== gate)
      : [...currentGates, gate];

    const updatedSettings = {
      ...(tenant?.settings as any),
      rbac: {
        ...rbac,
        [role]: updatedGates,
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings Panel</h1>
          <p className="text-muted-foreground text-sm">
            Manage your account profiles, country microplanning indicators, and GIS boundary datasets
          </p>
        </div>
      </div>

      <Tabs defaultValue="microplanning" className="w-full space-y-6">
        <TabsList className="flex flex-wrap h-auto p-1.5 bg-muted/60 dark:bg-muted/30 border border-border/40 backdrop-blur-md rounded-2xl w-full gap-1 shadow-lg overflow-x-auto custom-scrollbar">
          <TabsTrigger 
            value="profile" 
            className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center transition-all duration-300 hover:bg-accent/40 hover:text-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-sky-600 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-indigo-500 dark:data-[state=active]:to-sky-500 data-[state=active]:font-bold"
          >
            <User className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Profile & Security</span>
          </TabsTrigger>
          <TabsTrigger 
            value="microplanning" 
            className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center transition-all duration-300 hover:bg-accent/40 hover:text-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-sky-600 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-indigo-500 dark:data-[state=active]:to-sky-500 data-[state=active]:font-bold"
          >
            <SettingsIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Microplanning Settings</span>
          </TabsTrigger>
          <TabsTrigger 
            value="data_import" 
            className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center transition-all duration-300 hover:bg-accent/40 hover:text-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-sky-600 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-indigo-500 dark:data-[state=active]:to-sky-500 data-[state=active]:font-bold"
          >
            <Database className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Data Seeding</span>
          </TabsTrigger>
          <TabsTrigger 
            value="access" 
            className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center transition-all duration-300 hover:bg-accent/40 hover:text-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-sky-600 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-indigo-500 dark:data-[state=active]:to-sky-500 data-[state=active]:font-bold"
          >
            <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Permissions & Modules</span>
          </TabsTrigger>

          {/* Dynamic Administrative Triggers inside Systems settings */}
          {canAccessUserManagement && (
            <TabsTrigger 
              value="user_management" 
              className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center transition-all duration-300 hover:bg-accent/40 hover:text-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-sky-600 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-indigo-500 dark:data-[state=active]:to-sky-500 data-[state=active]:font-bold"
            >
              <Users className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>User Control</span>
            </TabsTrigger>
          )}
          {isNationalAdmin && (
            <>
              <TabsTrigger 
                value="signup_requests" 
                className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center transition-all duration-300 hover:bg-accent/40 hover:text-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-sky-600 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-indigo-500 dark:data-[state=active]:to-sky-500 data-[state=active]:font-bold"
              >
                <UserPlus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Access Requests</span>
              </TabsTrigger>
              <TabsTrigger 
                value="countries" 
                className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center transition-all duration-300 hover:bg-accent/40 hover:text-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-sky-600 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-indigo-500 dark:data-[state=active]:to-sky-500 data-[state=active]:font-bold"
              >
                <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Country Onboarding</span>
              </TabsTrigger>
              <TabsTrigger 
                value="boundaries" 
                className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center transition-all duration-300 hover:bg-accent/40 hover:text-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-sky-600 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-indigo-500 dark:data-[state=active]:to-sky-500 data-[state=active]:font-bold"
              >
                <Map className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Boundary Manager</span>
              </TabsTrigger>
            </>
          )}

          <TabsTrigger 
            value="system" 
            className="py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center transition-all duration-300 hover:bg-accent/40 hover:text-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-sky-600 data-[state=active]:text-white data-[state=active]:shadow-md dark:data-[state=active]:from-indigo-500 dark:data-[state=active]:to-sky-500 data-[state=active]:font-bold"
          >
            <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Appearance & Export</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Profile</CardTitle>
                    <CardDescription>Your account information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Name</Label>
                    <p className="font-medium">
                      {user?.firstName} {user?.lastName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Email</Label>
                    <p className="font-medium">{user?.email || "Not set"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Role</Label>
                    <Badge variant="secondary" className="capitalize">
                      {user?.role?.replace(/_/g, " ") || "User"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">HMIS Code</Label>
                    <p className="font-mono text-sm">{user?.hmisCode || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Notifications</CardTitle>
                    <CardDescription>Manage notification preferences</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Approval Requests</p>
                    <p className="text-xs text-muted-foreground">
                      Get notified when approvals are needed
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-approval-notifications" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Session Reminders</p>
                    <p className="text-xs text-muted-foreground">
                      Reminders for upcoming sessions
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-session-reminders" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Data Sync Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Alerts when sync fails or completes
                    </p>
                  </div>
                  <Switch data-testid="switch-sync-alerts" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Offline Mode</CardTitle>
                    <CardDescription>Configure offline functionality</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Enable Offline Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Allow working without internet connection
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-offline-mode" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Auto-sync on Connect</p>
                    <p className="text-xs text-muted-foreground">
                      Automatically sync when back online
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-auto-sync" />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="offline-stale-select" className="text-xs font-semibold">Offline Refetch Interval</Label>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Configures how frequently the system will fetch fresh records from the server instead of IndexedDB when working offline or with flaky connections.
                  </p>
                  <Select
                    value={offlineStaleHours}
                    onValueChange={(val) => {
                      setOfflineStaleHours(val);
                      localStorage.setItem("vaxplan_offline_stale_hours", val);
                      toast({
                        title: "Offline Sync Interval Updated",
                        description: `Offline records will remain cached for ${val} hour(s) before attempting online retrieval.`,
                      });
                    }}
                  >
                    <SelectTrigger id="offline-stale-select" className="w-full text-xs font-semibold bg-background">
                      <SelectValue placeholder="Select sync interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Hour</SelectItem>
                      <SelectItem value="2">2 Hours (Recommended)</SelectItem>
                      <SelectItem value="4">4 Hours</SelectItem>
                      <SelectItem value="8">8 Hours</SelectItem>
                      <SelectItem value="12">12 Hours</SelectItem>
                      <SelectItem value="24">24 Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Cached Data</p>
                    <Badge variant="outline">24 MB</Badge>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-clear-cache">
                    Clear Cache
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Security</CardTitle>
                    <CardDescription>Your security configurations</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">Session Active</p>
                  <p className="text-xs text-muted-foreground">
                    Logged in via Replit Auth
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => (window.location.href = "/api/logout")}
                  data-testid="button-logout"
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-mono">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Build</span>
                    <span className="font-mono">2024.12.13</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Country</span>
                    <span data-testid="text-settings-country">{tenant?.name ?? "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="microplanning" className="space-y-6 mt-6">
          <Card className="border border-border/80 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <SettingsIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Country & Demographics Settings</CardTitle>
                  <CardDescription>
                    Configure WHO global standard target population ratios, currencies, and GIS bounds.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-primary">Target Demographics (Annual %)</h3>
                <div className="grid sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="births-ratio" className="text-xs">Annual Births</Label>
                    <div className="relative">
                      <Input
                        id="births-ratio"
                        value={births}
                        onChange={(e) => setBirths(e.target.value)}
                        className="pr-7 font-mono text-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="under1-ratio" className="text-xs">Infants (&lt;1 yr)</Label>
                    <div className="relative">
                      <Input
                        id="under1-ratio"
                        value={under1}
                        onChange={(e) => setUnder1(e.target.value)}
                        className="pr-7 font-mono text-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pregnant-ratio" className="text-xs">Pregnant Women</Label>
                    <div className="relative">
                      <Input
                        id="pregnant-ratio"
                        value={pregnant}
                        onChange={(e) => setPregnant(e.target.value)}
                        className="pr-7 font-mono text-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="school-ratio" className="text-xs">School Entry</Label>
                    <div className="relative">
                      <Input
                        id="school-ratio"
                        value={schoolEntry}
                        onChange={(e) => setSchoolEntry(e.target.value)}
                        className="pr-7 font-mono text-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Ratios scale facility microplanning vaccine demand dynamically based on total village census populations.
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-primary">Financial & Location Settings</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="currency-code" className="text-xs">Currency Code</Label>
                    <Input
                      id="currency-code"
                      value={currencyCode}
                      onChange={(e) => setCurrencyCode(e.target.value)}
                      placeholder="e.g. PGK, USD, ZMW"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="currency-symbol" className="text-xs">Currency Symbol</Label>
                    <Input
                      id="currency-symbol"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      placeholder="e.g. K, $"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Maximum Approval Level</Label>
                    <Select
                      value={maxApprovalLevel}
                      onValueChange={setMaxApprovalLevel}
                    >
                      <SelectTrigger data-testid="select-max-approval-level">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="district">District Level</SelectItem>
                        <SelectItem value="provincial">Provincial Level</SelectItem>
                        <SelectItem value="national">National Level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-primary">Default GIS Coordinates</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="map-lat" className="text-xs">Map Latitude</Label>
                    <Input
                      id="map-lat"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="-6.0"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="map-lng" className="text-xs">Map Longitude</Label>
                    <Input
                      id="map-lng"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="145.0"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="map-zoom" className="text-xs">Map Zoom</Label>
                    <Input
                      id="map-zoom"
                      value={zoom}
                      onChange={(e) => setZoom(e.target.value)}
                      placeholder="6"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleSaveCountrySettings}
                  disabled={updateSettings.isPending}
                  className="w-full sm:w-auto font-semibold px-6 shadow"
                >
                  {updateSettings.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <WastageThresholdsCard isNationalAdmin={isNationalAdmin} />
        </TabsContent>        <TabsContent value="data_import" className="space-y-6 mt-6">
          {/* SECTION 1: POPULATION DATASETS */}
          <Card className="border border-border/80 shadow-md bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Population Datasets</CardTitle>
                  <CardDescription>
                    Upload gridded population raster files (GeoTIFF) or bulk seed tabular population metrics.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Raster Ingestion */}
                <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-muted/10">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                      <Map className="h-4 w-4" />
                      GeoTIFF Gridded Population Raster
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Stream spatial raster `.tif`/`.tiff` files directly into the Resources pool. This replaces or expands the gridded population base map.
                    </p>
                  </div>

                  <div
                    onDragEnter={handleDragPop}
                    onDragOver={handleDragPop}
                    onDragLeave={handleDragPop}
                    onDrop={handleDropPop}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                      dragActivePop
                        ? "border-indigo-500 bg-indigo-500/5 scale-[0.99] shadow-inner"
                        : "border-border/80 hover:border-indigo-500/40 hover:bg-muted/15"
                    }`}
                  >
                    <Upload className="h-6 w-6 text-muted-foreground animate-bounce" />
                    <span className="text-xs font-semibold text-center">Drag and drop Raster .tif here</span>
                    <label className="cursor-pointer mt-1">
                      <input
                        type="file"
                        accept=".tif,.tiff"
                        onChange={handleFileInputPop}
                        className="hidden"
                      />
                      <span className="inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground text-[10px] font-semibold h-7 px-3 border border-input hover:bg-accent transition-colors">
                        Browse Rasters
                      </span>
                    </label>
                  </div>

                  {isImportingPop && popUploadProgress > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[10px] font-semibold">
                        <span className="text-indigo-500 animate-pulse">Streaming Raster Bytes...</span>
                        <span className="font-mono">{popUploadProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-200"
                          style={{ width: `${popUploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Tabular Ingestion */}
                <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-muted/10">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                      <Database className="h-4 w-4" />
                      Tabular Population Spreadsheet
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Upload `.xlsx`, `.xls`, or `.csv` sheets containing targeted demographics, census counts, and birth rates.
                    </p>
                  </div>

                  <div
                    onDragEnter={handleDragPop}
                    onDragOver={handleDragPop}
                    onDragLeave={handleDragPop}
                    onDrop={handleDropPop}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                      dragActivePop
                        ? "border-indigo-500 bg-indigo-500/5 scale-[0.99] shadow-inner"
                        : "border-border/80 hover:border-indigo-500/40 hover:bg-muted/15"
                    }`}
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-semibold text-center">Drag and drop Spreadsheet here</span>
                    <label className="cursor-pointer mt-1">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileInputPop}
                        className="hidden"
                      />
                      <span className="inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground text-[10px] font-semibold h-7 px-3 border border-input hover:bg-accent transition-colors">
                        Browse Sheets
                      </span>
                    </label>
                  </div>

                  {isImportingPop && popUploadProgress === 0 && (
                    <div className="flex items-center justify-center gap-2 py-1 text-xs text-indigo-500 animate-pulse font-semibold">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Parsing demographic rows...
                    </div>
                  )}
                </div>
              </div>

              {/* Format Helper */}
              <div className="bg-muted/30 border border-border/40 rounded-lg p-3 space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground">Demographic Spreadsheet Supported Columns (Excel/CSV):</p>
                <div className="text-[10px] font-mono bg-background/50 border p-2 rounded text-foreground overflow-x-auto select-all">
                  VillageName*, VillageCode, FacilityHmisCode, Source* (nso/hmis/worldpop/community_census), Year*, TotalPopulation*, MalePopulation, FemalePopulation, Under1Population, Under5Population, PregnantWomen, GrowthRate, ConfidenceScore
                </div>
                <p className="text-[9px] text-muted-foreground italic">* Star indicates mandatory or logically matching fields. Upsert conflicts will auto-merge and overwrite data additively.</p>
              </div>

              {/* Result Telemetry */}
              {popResults && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  popResults.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-destructive/10 border-destructive/20 text-destructive"
                }`}>
                  {popResults.success ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" /> : <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{popResults.success ? "Population Seeding Successful" : "Ingestion Failed"}</p>
                    <p className="text-xs">{popResults.message}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECTION 2: HEALTH FACILITIES REGISTRY */}
          <Card className="border border-border/80 shadow-md bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-sky-500/10 flex items-center justify-center">
                  <Map className="h-5 w-5 text-sky-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Health Facilities Registry</CardTitle>
                  <CardDescription>
                    Seed primary care health centers and outreach posts, matched dynamically by HMIS codes.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div
                onDragEnter={handleDragFac}
                onDragOver={handleDragFac}
                onDragLeave={handleDragFac}
                onDrop={handleDropFac}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
                  dragActiveFac
                    ? "border-sky-500 bg-sky-500/5 scale-[0.99] shadow-inner"
                    : "border-border/80 hover:border-sky-500/40 hover:bg-muted/15"
                }`}
              >
                <div className={`p-3 rounded-full ${dragActiveFac ? "bg-sky-500/20 text-sky-500" : "bg-muted text-muted-foreground"} transition-all duration-300`}>
                  {isImportingFac ? <Loader2 className="h-6 w-6 animate-spin text-sky-500" /> : <Upload className="h-6 w-6" />}
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold">
                    {isImportingFac ? "Recalculating facility grids..." : "Drag and drop Facilities Excel/CSV here"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {!isImportingFac && "or click to upload from local storage"}
                  </p>
                </div>
                {!isImportingFac && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileInputFac}
                      className="hidden"
                    />
                    <span className="inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground text-xs font-semibold h-8 px-4 border border-input hover:bg-accent transition-colors">
                      Browse Facilities
                    </span>
                  </label>
                )}
              </div>

              {/* Format Helper */}
              <div className="bg-muted/30 border border-border/40 rounded-lg p-3 space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground">Health Facilities Spreadsheet Supported Columns (Excel/CSV):</p>
                <div className="text-[10px] font-mono bg-background/50 border p-2 rounded text-foreground overflow-x-auto select-all">
                  Name*, HMISCode*, FacilityType, AgencyName, OperationalStatus, DistrictName*, Latitude, Longitude, Address, ContactPhone, HasRefrigerator, HasPower, StaffCount, CatchmentRadius
                </div>
                <p className="text-[9px] text-muted-foreground italic">* Star indicates mandatory fields. Records matched by unique HMIS code are dynamically updated with fresh capacity metrics.</p>
              </div>

              {/* Result Telemetry */}
              {facResults && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  facResults.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-destructive/10 border-destructive/20 text-destructive"
                }`}>
                  {facResults.success ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" /> : <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{facResults.success ? "Facilities Seeding Complete" : "Ingestion Failed"}</p>
                    <p className="text-xs">{facResults.message}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECTION 3: COMMUNITIES & OUTREACH SETTLEMENTS */}
          <Card className="border border-border/80 shadow-md bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Communities & Outreach Settlements</CardTitle>
                  <CardDescription>
                    Seed community databases from maps or bulk seed targeted outreach village registry details.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Centroid Map Extraction Trigger */}
              <div className="rounded-xl p-4 border border-border/60 bg-muted/20 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    <Map className="h-4 w-4" />
                    Option A: Seeding Centroids from Boundary Map
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Automatically computes geographic centroids for all administrative boundary polygons seeded in the system and links them to the nearest health facility.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="text-[10px] text-muted-foreground max-w-sm italic">
                    Uses polygon vertex triangulation and links villages using Haversine calculation.
                  </div>
                  <Button
                    onClick={handleExtractBoundaries}
                    disabled={isExtracting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md transition-all shrink-0 flex items-center gap-2"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Map className="h-4 w-4" />
                        Extract Boundaries
                      </>
                    )}
                  </Button>
                </div>

                {isExtracting && (
                  <div className="space-y-2 pt-2 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-emerald-500 animate-pulse">{extractionStage}</span>
                      <span className="font-mono font-bold text-muted-foreground">{extractionProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${extractionProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {showReport && importResults && importResults.success && (
                  <div className="mt-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Boundary Extraction Success</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/20">
                        <span className="text-muted-foreground">Boundary Layer Processed</span>
                        <span className="font-semibold text-foreground">Triangulation Centroid</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/20">
                        <span className="text-muted-foreground">New Communities Seeded</span>
                        <span className="font-semibold text-emerald-600 font-mono font-bold">{importResults.count || 0} villages</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/20">
                        <span className="text-muted-foreground">Processing Time</span>
                        <span className="font-semibold text-foreground">{extractionDuration || "—"} seconds</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabular Village Ingestion */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Option B: Spreadsheet Village Registry Ingestion
                </h4>
                
                <div
                  onDragEnter={handleDragVil}
                  onDragOver={handleDragVil}
                  onDragLeave={handleDragVil}
                  onDrop={handleDropVil}
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
                    dragActiveVil
                      ? "border-emerald-500 bg-emerald-500/5 scale-[0.99] shadow-inner"
                      : "border-border/80 hover:border-emerald-500/40 hover:bg-muted/15"
                  }`}
                >
                  <div className={`p-3 rounded-full ${dragActiveVil ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"} transition-all duration-300`}>
                    {isImportingVil ? <Loader2 className="h-6 w-6 animate-spin text-emerald-500" /> : <Upload className="h-6 w-6" />}
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold">
                      {isImportingVil ? "Updating catchment distances..." : "Drag and drop Communities Excel/CSV here"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {!isImportingVil && "or click to upload from local storage"}
                    </p>
                  </div>
                  {!isImportingVil && (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileInputVil}
                        className="hidden"
                      />
                      <span className="inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground text-xs font-semibold h-8 px-4 border border-input hover:bg-accent transition-colors">
                        Browse Communities
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Format Helper */}
              <div className="bg-muted/30 border border-border/40 rounded-lg p-3 space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground">Communities Spreadsheet Supported Columns (Excel/CSV):</p>
                <div className="text-[10px] font-mono bg-background/50 border p-2 rounded text-foreground overflow-x-auto select-all">
                  Name*, Code, DistrictName*, IsHardToReach, Latitude, Longitude, FacilityHmisCode*, InsecurityLevel, Comments
                </div>
                <p className="text-[9px] text-muted-foreground italic">* Star indicates mandatory fields. The system automatically models walking (HTR) and motorized travel times to assigned facilities.</p>
              </div>

              {/* Result Telemetry */}
              {vilResults && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  vilResults.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-destructive/10 border-destructive/20 text-destructive"
                }`}>
                  {vilResults.success ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" /> : <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{vilResults.success ? "Communities Seeding Complete" : "Ingestion Failed"}</p>
                    <p className="text-xs">{vilResults.message}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-6 mt-6">
          {/* SYSTEM MODULES DASHBOARD */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
                System Modules Dashboard
              </CardTitle>
              <CardDescription>
                Enable or disable functional modules dynamically across sidebar and page routings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Budget Planning</Label>
                    <p className="text-xs text-muted-foreground">Manage health worker session funding</p>
                  </div>
                  <Switch checked={modules.budget} onCheckedChange={() => toggleModule("budget")} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Vaccine Calculator</Label>
                    <p className="text-xs text-muted-foreground">Forecast antigen doses and wastage</p>
                  </div>
                  <Switch checked={modules.calculator} onCheckedChange={() => toggleModule("calculator")} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Stock Ledger</Label>
                    <p className="text-xs text-muted-foreground">Track cold chain inventory transactions</p>
                  </div>
                  <Switch checked={modules.stock} onCheckedChange={() => toggleModule("stock")} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Social Mobilization</Label>
                    <p className="text-xs text-muted-foreground">Schedule community engagement tasks</p>
                  </div>
                  <Switch checked={modules.mobilization} onCheckedChange={() => toggleModule("mobilization")} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Hard-to-Reach Scores</Label>
                    <p className="text-xs text-muted-foreground">Risk-weight remote catchment villages</p>
                  </div>
                  <Switch checked={modules.htr} onCheckedChange={() => toggleModule("htr")} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">HIS Interoperability</Label>
                    <p className="text-xs text-muted-foreground">Sync with FHIR and DHIS2 endpoints</p>
                  </div>
                  <Switch checked={modules.interop} onCheckedChange={() => toggleModule("interop")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* GRANULAR ROLE-BASED ACCESS CONTROL MATRIX */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Granular Role-Based Access Control
              </CardTitle>
              <CardDescription>
                Customize dynamic permission mappings for system user roles against operational gates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="p-3 font-semibold text-foreground">System Role</th>
                      <th className="p-3 text-center font-semibold text-foreground">View Registry</th>
                      <th className="p-3 text-center font-semibold text-foreground">Log Vax Doses</th>
                      <th className="p-3 text-center font-semibold text-foreground">Create Plans</th>
                      <th className="p-3 text-center font-semibold text-foreground">Approve Plans</th>
                      <th className="p-3 text-center font-semibold text-foreground">Manage Facilities</th>
                      <th className="p-3 text-center font-semibold text-foreground">Manage Settings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      { id: "facility_clerk", label: "Facility Clerk" },
                      { id: "facility_in_charge", label: "Facility In-Charge" },
                      { id: "district_manager", label: "District Manager" },
                      { id: "provincial_coordinator", label: "Provincial Coordinator" },
                      { id: "national_admin", label: "National Admin" },
                    ].map((role) => (
                      <tr key={role.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-foreground capitalize">{role.label}</td>
                        {[
                          { id: "view_demographics", label: "View Registry" },
                          { id: "log_immunizations", label: "Log Vax Doses" },
                          { id: "create_session_plans", label: "Create Plans" },
                          { id: "approve_session_plans", label: "Approve Plans" },
                          { id: "manage_facilities", label: "Manage Facilities" },
                          { id: "manage_settings", label: "Manage Settings" },
                        ].map((gate) => {
                          const hasPerm = (rbac[role.id] || []).includes(gate.id);
                          return (
                            <td key={gate.id} className="p-3 text-center">
                              <Checkbox
                                checked={hasPerm}
                                onCheckedChange={() => togglePermission(role.id, gate.id)}
                                className="h-4 w-4 border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Data Export
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="button-export-facilities"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Facilities
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="button-export-population"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Population
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  data-testid="button-export-sessions"
                >
                  <Download className="h-4 w-24 mr-2" />
                  Export Sessions
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Theme</p>
                    <p className="text-xs text-muted-foreground">
                      Toggle light/dark mode
                    </p>
                  </div>
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dynamic Administrative Tab Contents */}
        {canAccessUserManagement && (
          <TabsContent value="user_management" className="space-y-6 mt-6 animate-in fade-in duration-300">
            <UserManagement />
          </TabsContent>
        )}
        {isNationalAdmin && (
          <>
            <TabsContent value="signup_requests" className="space-y-6 mt-6 animate-in fade-in duration-300">
              <SignupRequests />
            </TabsContent>
            <TabsContent value="countries" className="space-y-6 mt-6 animate-in fade-in duration-300">
              <CountryOnboarding />
            </TabsContent>
            <TabsContent value="boundaries" className="space-y-6 mt-6 animate-in fade-in duration-300">
              <BoundaryManager />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
