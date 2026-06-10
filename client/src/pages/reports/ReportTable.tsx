/**
 * ReportTable.tsx
 *
 * Reusable hierarchical data table for the Reporting Engine.
 * Rows are indented by level (province → district → facility) and collapse/expand
 * when the user clicks a parent row.
 */

import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Building2, MapPin, Map as MapIcon, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { HierarchyRow, ReportLevel } from "./types";
import { LEVEL_COLOR, LEVEL_BADGE, LEVEL_INDENT } from "./types";

interface ColumnDef {
  key: string;
  label: string;
  format?: (val: unknown) => string;
  align?: "left" | "right" | "center";
}

interface ReportTableProps {
  rows: HierarchyRow[];
  columns: ColumnDef[];
  isLoading?: boolean;
  emptyMessage?: string;
}

const LEVEL_ICONS: Record<ReportLevel, React.ElementType> = {
  national: Globe,
  province: MapIcon,
  district: MapPin,
  facility: Building2,
};

function num(v: unknown, decimals = 0): string {
  const n = parseFloat(String(v ?? 0));
  if (isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function defaultNumFormat(v: unknown): string {
  return num(v);
}

export function pctFormat(v: unknown): string {
  const n = parseFloat(String(v ?? 0));
  if (isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export function currencyFormat(v: unknown): string {
  const n = parseFloat(String(v ?? 0));
  if (isNaN(n)) return "—";
  return `K ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Helper function to reorder rows hierarchically (Pre-order DFS traversal of the location tree)
// to ensure children immediately follow their parents instead of appearing at the bottom of the table.
function buildHierarchicalRows(flatRows: HierarchyRow[]): HierarchyRow[] {
  const childrenMap = new Map<string | number, HierarchyRow[]>();
  const rootRows: HierarchyRow[] = [];
  const allIds = new Set(flatRows.map((r) => r.id));

  for (const row of flatRows) {
    if (row.parent_id === null || row.parent_id === undefined || !allIds.has(row.parent_id)) {
      rootRows.push(row);
    } else {
      if (!childrenMap.has(row.parent_id)) {
        childrenMap.set(row.parent_id, []);
      }
      childrenMap.get(row.parent_id)!.push(row);
    }
  }

  const sortedRows: HierarchyRow[] = [];

  function traverse(row: HierarchyRow) {
    sortedRows.push(row);
    const children = childrenMap.get(row.id);
    if (children) {
      // Sort children alphabetically by name
      const sortedChildren = [...children].sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      );
      for (const child of sortedChildren) {
        traverse(child);
      }
    }
  }

  const levelOrder: Record<string, number> = {
    national: 0,
    province: 1,
    district: 2,
    facility: 3,
  };

  const sortedRoots = [...rootRows].sort((a, b) => {
    const lvlA = levelOrder[a.level] ?? 99;
    const lvlB = levelOrder[b.level] ?? 99;
    if (lvlA !== lvlB) return lvlA - lvlB;
    return String(a.name).localeCompare(String(b.name));
  });

  for (const root of sortedRoots) {
    traverse(root);
  }

  // Append any orphans just in case
  const addedIds = new Set(sortedRows.map((r) => r.id));
  for (const row of flatRows) {
    if (!addedIds.has(row.id)) {
      sortedRows.push(row);
    }
  }

  return sortedRows;
}

export default function ReportTable({
  rows,
  columns,
  isLoading = false,
  emptyMessage = "No data available for the selected filters.",
}: ReportTableProps) {
  // Track which province/district IDs are collapsed
  const [collapsed, setCollapsed] = useState<Set<string | number>>(new Set());

  const toggle = (id: string | number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /*
  // ORIGINAL IMPLEMENTATION (Flat Ordering):
  // Renders the rows in whatever flat order they arrive from the API, putting all districts/facilities 
  // at the bottom of the table instead of placing them hierarchically underneath their parent provinces.
  // Determine which rows are visible given current collapse state
  const visibleRows = useMemo(() => {
    const hidden = new Set<string | number>();

    for (const row of rows) {
      if (row.parent_id != null && hidden.has(row.parent_id)) {
        hidden.add(row.id);
      } else if (collapsed.has(row.id)) {
        // Mark children as hidden
      }
    }

    // Second pass: also hide direct children of collapsed parents
    const collapsedSet = collapsed;
    return rows.filter((row) => {
      if (row.parent_id == null) return true; // province/national always visible
      // Check if any ancestor is collapsed
      let current: string | number | null = row.parent_id;
      let depth = 0;
      while (current != null && depth < 5) {
        if (collapsedSet.has(current)) return false;
        const parent = rows.find((r) => r.id === current);
        current = parent?.parent_id ?? null;
        depth++;
      }
      return true;
    });
  }, [rows, collapsed]);

  // Determine which IDs have children
  const hasChildren = useMemo(() => {
    const set = new Set<string | number>();
    for (const row of rows) {
      if (row.parent_id != null) set.add(row.parent_id);
    }
    return set;
  }, [rows]);
  */

  // HIERARCHICAL IMPLEMENTATION (Smart Cascades):
  // 1. Sort all rows using buildHierarchicalRows so children are ordered directly under their parents.
  const sortedRows = useMemo(() => {
    return buildHierarchicalRows(rows);
  }, [rows]);

  // 2. Filter to only visible rows given the parent collapse state.
  const visibleRows = useMemo(() => {
    const collapsedSet = collapsed;
    return sortedRows.filter((row) => {
      if (row.parent_id == null) return true;
      let current: string | number | null = row.parent_id;
      let depth = 0;
      while (current != null && depth < 5) {
        if (collapsedSet.has(current)) return false;
        const parent = sortedRows.find((r) => r.id === current);
        current = parent?.parent_id ?? null;
        depth++;
      }
      return true;
    });
  }, [sortedRows, collapsed]);

  // 3. Keep track of which parent IDs actually have children loaded.
  const hasChildren = useMemo(() => {
    const set = new Set<string | number>();
    for (const row of sortedRows) {
      if (row.parent_id != null) set.add(row.parent_id);
    }
    return set;
  }, [sortedRows]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 border-b border-border sticky top-0 z-10">
          <tr>
            <th className="text-left p-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground w-64 min-w-[200px]">
              Location
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`p-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground ${
                  col.align === "left" ? "text-left" : "text-right"
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {visibleRows.map((row) => {
            const level = row.level as ReportLevel;
            const indent = LEVEL_INDENT[level] ?? 0;
            const isExpandable = hasChildren.has(row.id);
            const isCollapsed = collapsed.has(row.id);
            const Icon = LEVEL_ICONS[level];

            return (
              <tr
                key={`${level}-${row.id}`}
                className={`group transition-colors hover:bg-muted/20 ${
                  level === "province" ? "bg-blue-500/3" : ""
                } ${level === "district" ? "bg-green-500/2" : ""}`}
              >
                {/* Location column */}
                <td className="p-3">
                  <div
                    className="flex items-center gap-2"
                    style={{ paddingLeft: `${indent * 20}px` }}
                  >
                    {isExpandable ? (
                      <button
                        onClick={() => toggle(row.id)}
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-colors flex-shrink-0"
                        aria-label={isCollapsed ? "Expand" : "Collapse"}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    ) : (
                      <span className="h-5 w-5 flex-shrink-0" />
                    )}
                    <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${
                      level === "province" ? "text-blue-500" :
                      level === "district" ? "text-green-500" :
                      level === "facility" ? "text-orange-500" : "text-slate-500"
                    }`} />
                    <span className={LEVEL_COLOR[level]}>
                      {row.name as string}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-4 capitalize ${LEVEL_BADGE[level]}`}
                    >
                      {level}
                    </Badge>
                  </div>
                </td>

                {/* Metric columns */}
                {columns.map((col) => {
                  const rawVal = row[col.key];
                  const displayVal = col.format
                    ? col.format(rawVal)
                    : rawVal != null
                    ? String(rawVal)
                    : "—";
                  return (
                    <td
                      key={col.key}
                      className={`p-3 font-mono tabular-nums ${
                        col.align === "left" ? "text-left" : "text-right"
                      } ${LEVEL_COLOR[level]}`}
                    >
                      {displayVal}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
