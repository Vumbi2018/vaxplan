import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search, Download } from "lucide-react";
import { useState, useMemo } from "react";
// XLSX is loaded lazily on-demand (only when the user clicks Export) to keep
// it out of the main JS bundle — the library is 424 kB raw / 142 kB gzipped.
import { useToast } from "@/hooks/use-toast";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  onRowClick?: (item: T) => void;
  onExport?: () => void;
  exportFileName?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
}

export function DataTable<T extends { id?: number | string }>({
  data,
  columns,
  searchable = true,
  searchKeys = [],
  pageSize = 10,
  onRowClick,
  onExport,
  exportFileName = "export",
  emptyMessage = "No data available",
  searchPlaceholder = "Search...",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(pageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    if (onExport) {
      onExport();
      return;
    }

    try {
      // Dynamically import xlsx only when the user clicks Export so the 142 kB
      // gzipped library stays out of the main bundle on every other page.
      const XLSX = await import("@e965/xlsx");

      const exportData = sortedData.map((item) => {
        const row: Record<string, unknown> = {};
        columns.forEach((col) => {
          const key = String(col.key);
          const value = (item as Record<string, unknown>)[key];
          row[col.header] = value ?? "";
        });
        return row;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Data");

      const fileName = `${exportFileName}_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Export Successful",
        description: `Data exported to ${fileName}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data to Excel.",
        variant: "destructive",
      });
    }
  };

  const filteredData = useMemo(() => {
    if (!search || searchKeys.length === 0) return data;

    const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return data;

    return data.filter((item) =>
      tokens.every((token) =>
        searchKeys.some((key) => {
          const value = item[key];
          return String(value || "").toLowerCase().includes(token);
        })
      )
    );
  }, [data, search, searchKeys]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      const comparison = String(aValue).localeCompare(String(bValue));
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / limit);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * limit,
    currentPage * limit
  );

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return prev.direction === "asc"
          ? { key, direction: "desc" }
          : null;
      }
      return { key, direction: "asc" };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {searchable && (
          <div className="relative flex-1 min-w-64 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
              data-testid="input-table-search"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          {(onExport || data.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              data-testid="button-export-table"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border overflow-hidden sticky-table-container max-h-[600px] custom-scrollbar">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => {
                const isSortable = col.sortable !== false;
                return (
                  <TableHead
                    key={String(col.key)}
                    className={isSortable ? "cursor-pointer select-none" : ""}
                    onClick={() => isSortable && handleSort(String(col.key))}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {sortConfig?.key === col.key ? (
                        <span className="text-xs">
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      ) : (
                        isSortable && <span className="text-xs opacity-30">⇅</span>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow
                  key={item.id ?? index}
                  className={onRowClick ? "cursor-pointer hover-elevate" : ""}
                  onClick={() => onRowClick?.(item)}
                  data-testid={`table-row-${item.id ?? index}`}
                >
                  {columns.map((col) => (
                    <TableCell key={String(col.key)}>
                      {col.render
                        ? col.render(item)
                        : String((item as any)[col.key] ?? "-")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {sortedData.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * limit + 1} to{" "}
              {Math.min(currentPage * limit, sortedData.length)} of{" "}
              {sortedData.length} results
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows per page:</span>
              <Select
                value={String(limit)}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16">
                  <SelectValue placeholder={String(limit)} />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Page:</span>
              <Select
                value={String(currentPage)}
                onValueChange={(value) => setCurrentPage(Number(value))}
                disabled={totalPages <= 1}
              >
                <SelectTrigger className="h-8 w-16">
                  <SelectValue placeholder={String(currentPage)} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <SelectItem key={page} value={String(page)}>
                      {page}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">of {totalPages || 1}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
