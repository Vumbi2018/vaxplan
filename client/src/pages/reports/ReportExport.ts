/**
 * ReportExport.ts
 *
 * Lazy-loaded export utility for the Reporting Engine.
 * Exports to Excel (.xlsx) or CSV without loading XLSX until the user clicks Export.
 */

import type { HierarchyRow } from "./types";

// -------------------------------------------------------------------------
// CSV export (no external dependency)
// -------------------------------------------------------------------------
function rowToFlat(row: HierarchyRow): Record<string, string | number> {
  const { level, id, name, parent_id, ...rest } = row;
  const out: Record<string, string | number> = {
    Level: level,
    Name: name,
  };
  for (const [k, v] of Object.entries(rest)) {
    if (v !== null && v !== undefined) {
      out[k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())] =
        typeof v === "number" ? v : String(v);
    }
  }
  return out;
}

export function exportToCsv(rows: HierarchyRow[], filename: string) {
  if (!rows.length) return;
  const flat = rows.map(rowToFlat);
  const headers = Object.keys(flat[0]);
  const lines = [
    headers.join(","),
    ...flat.map((r) =>
      headers
        .map((h) => {
          const v = r[h] ?? "";
          const s = String(v);
          return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------------------
// Excel export (lazy-loaded xlsx)
// -------------------------------------------------------------------------
export async function exportToExcel(
  rows: HierarchyRow[],
  sheetName: string,
  filename: string
) {
  const XLSX = await import("@e965/xlsx");
  if (!rows.length) return;

  const flat = rows.map(rowToFlat);
  const ws = XLSX.utils.json_to_sheet(flat);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
