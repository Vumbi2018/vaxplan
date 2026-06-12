/**
 * WikiEditor.tsx
 *
 * Admin-only page that lets national admins and GIS specialists create,
 * edit, reorder and unpublish VaxPlan Wiki pages.
 *
 * Route:  /admin/wiki
 * Guard:  national_admin | gis_specialist | isPlatformAdmin (enforced
 *         both here and on the server API side).
 *
 * No extra dependencies — uses a plain <textarea> for editing with a
 * rendered preview via the same marked.js CDN the docs site uses.
 * (A full WYSIWYG editor would require a large bundle; the textarea +
 *  live preview gives 90% of the value with zero extra kB.)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  ExternalLink,
  BookOpen,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WikiPage {
  id: number;
  slug: string;
  title: string;
  body?: string;
  sort_order: number;
  is_published: boolean;
  updated_by?: string;
  updated_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

/** Render Markdown to HTML via the window.marked object (loaded from CDN in build.mjs / index.html).
 *  Falls back to a plain <pre> if marked is not available. */
function renderMarkdown(md: string): string {
  try {
    if (typeof (window as any).marked !== "undefined") {
      return (window as any).marked.parse(md);
    }
  } catch {
    /* ignore */
  }
  // Simple fallback: escape and wrap
  return `<pre style="white-space:pre-wrap;word-break:break-word">${md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</pre>`;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchPages(): Promise<WikiPage[]> {
  const res = await fetch("/api/wiki/pages?all=true");
  if (!res.ok) throw new Error("Failed to load wiki pages");
  const json = await res.json();
  return json.data as WikiPage[];
}

async function fetchPageBody(slug: string): Promise<WikiPage> {
  const res = await fetch(`/api/wiki/pages/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error("Failed to load page");
  const json = await res.json();
  return json.data as WikiPage;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function WikiEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Access guard ────────────────────────────────────────────────────────────
  const u = user as any;
  const canEdit =
    u?.isPlatformAdmin ||
    u?.role === "national_admin" ||
    u?.role === "gis_specialist" ||
    (Array.isArray(u?.roles) &&
      (u.roles.includes("national_admin") || u.roles.includes("gis_specialist")));

  // ── State ───────────────────────────────────────────────────────────────────
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WikiPage | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit");
  const [pageFilter, setPageFilter] = useState<"all" | "published" | "unpublished">("all");

  // Form fields
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editBody, setEditBody] = useState("");
  const [slugEdited, setSlugEdited] = useState(false); // true once user manually edited slug
  const [isNewPage, setIsNewPage] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Paste image handler: uploads clipboard images immediately and inserts markdown reference
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        
        e.preventDefault();
        setUploadingMedia(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch("/api/wiki/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || "Failed to upload file");
          }
          const data = await res.json();
          const mdInsert = `\n![Uploaded Screenshot](${data.url})\n`;
          insertMd(mdInsert);
          toast({ title: "Image pasted & uploaded", description: "The screenshot has been uploaded and inserted inline." });
        } catch (err: any) {
          toast({ title: "Paste upload failed", description: err.message, variant: "destructive" });
        } finally {
          setUploadingMedia(false);
        }
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/wiki/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to upload file");
      }
      const data = await res.json();
      
      const isVideo = file.type.startsWith("video/");
      const isPdf = file.type === "application/pdf";
      let mdInsert = "";
      if (isVideo) {
        mdInsert = `\n<video controls src="${data.url}" style="max-width: 100%; border-radius: 8px;"></video>\n`;
      } else if (isPdf) {
        mdInsert = `\n[Download PDF](${data.url})\n`;
      } else {
        mdInsert = `\n![${file.name}](${data.url})\n`;
      }
      
      insertMd(mdInsert);
      toast({ title: "Upload successful", description: `Uploaded ${file.name} successfully.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Queries ─────────────────────────────────────────────────────────────────
  const {
    data: pages = [],
    isLoading: pagesLoading,
    refetch: refetchPages,
  } = useQuery<WikiPage[]>({
    queryKey: ["/api/wiki/pages?all=true"],
    queryFn: fetchPages,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const invalidatePages = () => qc.invalidateQueries({ queryKey: ["/api/wiki/pages?all=true"] });

  /* ORIGINAL CODE (Overwritten to fix (intermediate value).json is not a function error):
  const createMutation = useMutation({
    mutationFn: async (data: { slug: string; title: string; body: string; sort_order: number }) => {
      const res: any = await apiRequest("POST", "/api/wiki/pages", data);
      return res.json();
    },
    onSuccess: () => {
      invalidatePages();
      setEditorOpen(false);
      toast({ title: "Page created", description: "The new wiki page is now live." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      slug,
      data,
    }: {
      slug: string;
      data: Partial<{ title: string; body: string; sort_order: number; is_published: boolean }>;
    }) => {
      const res: any = await apiRequest("PUT", `/api/wiki/pages/${slug}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidatePages();
      setEditorOpen(false);
      toast({ title: "Page saved", description: "Changes are live on docs.vaxplan.org." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res: any = await apiRequest("DELETE", `/api/wiki/pages/${slug}`, undefined);
      return res.json();
    },
    onSuccess: () => {
      invalidatePages();
      setDeleteTarget(null);
      toast({ title: "Page unpublished", description: "The page is no longer public." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
  */

  const createMutation = useMutation({
    mutationFn: async (data: { slug: string; title: string; body: string; sort_order: number }) => {
      const res = await apiRequest("POST", "/api/wiki/pages", data);
      return res;
    },
    onSuccess: () => {
      invalidatePages();
      setEditorOpen(false);
      toast({ title: "Page created", description: "The new wiki page is now live." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      slug,
      data,
    }: {
      slug: string;
      data: Partial<{ title: string; body: string; sort_order: number; is_published: boolean }>;
    }) => {
      const res = await apiRequest("PUT", `/api/wiki/pages/${slug}`, data);
      return res;
    },
    onSuccess: () => {
      invalidatePages();
      setEditorOpen(false);
      toast({ title: "Page saved", description: "Changes are live on docs.vaxplan.org." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Separate mutation for toggling publish state — does NOT close the editor
  const toggleMutation = useMutation({
    mutationFn: async ({ slug, is_published }: { slug: string; is_published: boolean }) => {
      const res = await apiRequest("PUT", `/api/wiki/pages/${slug}`, { is_published });
      return res;
    },
    onSuccess: (_data, vars) => {
      invalidatePages();
      toast({
        title: vars.is_published ? "Page published" : "Page unpublished",
        description: vars.is_published
          ? "The page is now visible on docs.vaxplan.org."
          : "The page is hidden from the public docs site but preserved in the database.",
      });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await apiRequest("DELETE", `/api/wiki/pages/${slug}`, undefined);
      return res;
    },
    onSuccess: () => {
      invalidatePages();
      setDeleteTarget(null);
      toast({ title: "Page unpublished", description: "The page is no longer public." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // ── Editor helpers ────────────────────────────────────────────────────────────

  const openNewPage = () => {
    setIsNewPage(true);
    setEditTitle("");
    setEditSlug("");
    setEditBody("");
    setSlugEdited(false);
    setViewMode("edit");
    setEditorOpen(true);
  };

  const openEditPage = useCallback(
    async (page: WikiPage) => {
      setIsNewPage(false);
      setEditTitle(page.title);
      setEditSlug(page.slug);
      setSlugEdited(true);
      setViewMode("edit");

      // Fetch body (not included in the list response)
      try {
        const full = await fetchPageBody(page.slug);
        setEditBody(full.body ?? "");
      } catch {
        setEditBody("");
      }
      setEditorOpen(true);
    },
    []
  );

  const handleTitleChange = (v: string) => {
    setEditTitle(v);
    if (!slugEdited) setEditSlug(slugify(v));
  };

  const handleSave = () => {
    if (!editTitle.trim()) {
      toast({ title: "Validation", description: "Title is required.", variant: "destructive" });
      return;
    }
    if (!editSlug.trim()) {
      toast({ title: "Validation", description: "Slug is required.", variant: "destructive" });
      return;
    }
    if (isNewPage) {
      createMutation.mutate({
        slug: editSlug,
        title: editTitle,
        body: editBody,
        sort_order: (pages.length + 1) * 10,
      });
    } else {
      updateMutation.mutate({
        slug: editSlug,
        data: { title: editTitle, body: editBody },
      });
    }
  };

  const handleMoveUp = (page: WikiPage, idx: number) => {
    if (idx === 0) return;
    const prev = pages[idx - 1];
    updateMutation.mutate({ slug: page.slug, data: { sort_order: prev.sort_order - 1 } });
  };

  const handleMoveDown = (page: WikiPage, idx: number) => {
    const filteredLen = pageFilter === "all" ? pages.length
      : pageFilter === "published" ? pages.filter(p => p.is_published).length
      : pages.filter(p => !p.is_published).length;
    if (idx === filteredLen - 1) return;
    const next = pages[idx + 1];
    updateMutation.mutate({ slug: page.slug, data: { sort_order: next.sort_order + 1 } });
  };


  const handleTogglePublished = (page: WikiPage) => {
    toggleMutation.mutate({
      slug: page.slug,
      is_published: !page.is_published,
    });
  };

  // ── Insert Markdown helpers ───────────────────────────────────────────────────

  const insertMd = (before: string, after = "") => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = ta.value.slice(start, end);
    const replacement = before + (sel || "text") + after;
    const newVal = ta.value.slice(0, start) + replacement + ta.value.slice(end);
    setEditBody(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + (sel || "text").length);
    }, 0);
  };

  // ── Guard render ──────────────────────────────────────────────────────────────

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold">Wiki Editor</h2>
          <p className="text-muted-foreground text-sm mt-1">
            You need the <strong>national_admin</strong> or <strong>gis_specialist</strong> role to edit wiki pages.
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Wiki Editor
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage pages published at{" "}
            <a
              href="https://docs.vaxplan.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              docs.vaxplan.org <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => refetchPages()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={openNewPage}>
            <Plus className="h-4 w-4 mr-1" />
            New Page
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-800 dark:text-blue-200">
        <strong>How it works:</strong> Changes you make here appear live on the documentation site within seconds.
        Pages are written in Markdown. Reorder pages using the ↑↓ arrows. Unpublishing hides a page from the
        public docs site but does not delete it.
      </div>

      {/* Page list */}
        <div className="rounded-lg border bg-card overflow-hidden">
          {/* Filter Tabs */}
          <div className="flex items-center border-b bg-muted/30">
            {(["all", "published", "unpublished"] as const).map((f) => {
              const count = f === "all" ? pages.length : f === "published" ? pages.filter(p => p.is_published).length : pages.filter(p => !p.is_published).length;
              return (
                <button
                  key={f}
                  onClick={() => setPageFilter(f)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 ${
                    pageFilter === f
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All Pages" : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    pageFilter === f ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}>{count}</span>
                </button>
              );
            })}
            <span className="ml-auto pr-4 text-xs text-muted-foreground">Drag or use arrows to reorder</span>
          </div>

        {pagesLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : pages.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No wiki pages yet. Click <strong>New Page</strong> to get started.</p>
          </div>
        ) : (() => {
          const filtered = pages.filter(p =>
            pageFilter === "all" ? true : pageFilter === "published" ? p.is_published : !p.is_published
          );
          if (filtered.length === 0) {
            return (
              <div className="p-8 text-center text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">
                  {pageFilter === "unpublished" ? "No unpublished pages." : "No published pages yet."}
                </p>
              </div>
            );
          }
          return (
          <ul className="divide-y">
            {filtered.map((page, idx) => (
              <li
                key={page.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
              >
                {/* Order arrows */}
                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleMoveUp(page, idx)}
                    disabled={idx === 0 || updateMutation.isPending}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                    title="Move up"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(page, idx)}
                    disabled={idx === filtered.length - 1 || updateMutation.isPending}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                    title="Move down"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />

                {/* Page info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{page.title}</span>
                    {!page.is_published && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400">
                        Unpublished
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    <code className="bg-muted px-1 rounded text-[10px]">/#{page.slug}</code>
                    <span>·</span>
                    <span>Updated {new Date(page.updated_at).toLocaleDateString()}</span>
                    {page.updated_by && (
                      <>
                        <span>·</span>
                        <span>by {page.updated_by}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleTogglePublished(page)}
                    disabled={toggleMutation.isPending || updateMutation.isPending}
                    title={page.is_published ? "Unpublish page" : "Publish page"}
                  >
                    {page.is_published ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => openEditPage(page)}
                    title="Edit page"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(page)}
                    title="Delete / unpublish page"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          );
        })()}
      </div>

      {/* ── Editor Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={editorOpen} onOpenChange={(v) => !v && setEditorOpen(false)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">
                {isNewPage ? "New Wiki Page" : `Edit: ${editTitle}`}
              </DialogTitle>
              <DialogClose asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>

          {/* Meta fields */}
          <div className="px-6 py-3 border-b flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Page Title *</label>
              <Input
                id="wiki-title"
                value={editTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Getting Started"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                URL Slug *{" "}
                <span className="font-normal text-muted-foreground">
                  (docs.vaxplan.org/#{editSlug})
                </span>
              </label>
              <Input
                id="wiki-slug"
                value={editSlug}
                onChange={(e) => {
                  setEditSlug(e.target.value);
                  setSlugEdited(true);
                }}
                placeholder="e.g. getting-started"
                disabled={!isNewPage}
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-6 py-2 border-b flex-shrink-0 flex items-center gap-1 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Format:</span>
            {[
              { label: "B", md: "**", after: "**", title: "Bold" },
              { label: "I", md: "_", after: "_", title: "Italic" },
              { label: "H2", md: "## ", after: "", title: "Heading 2" },
              { label: "H3", md: "### ", after: "", title: "Heading 3" },
              { label: "• List", md: "- ", after: "", title: "Bullet list" },
              { label: "Link", md: "[", after: "](url)", title: "Hyperlink" },
              { label: "`Code`", md: "`", after: "`", title: "Inline code" },
              { label: "```Block", md: "```\n", after: "\n```", title: "Code block" },
              { label: "> Quote", md: "> ", after: "", title: "Blockquote" },
              { label: "Table", md: "\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n", after: "", title: "Insert Table" },
              { label: "Alert", md: "\n> [!NOTE]\n> Note content here\n", after: "", title: "GitHub Warning/Note Callout" },
              { label: "Details", md: "\n<details>\n<summary>Click to expand</summary>\n\nHidden content here\n</details>\n", after: "", title: "Collapsible DETAILS block" },
              { label: "---", md: "\n---\n", after: "", title: "Horizontal rule" },
            ].map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => insertMd(t.md, t.after)}
                title={t.title}
                className="px-2 py-0.5 text-xs border rounded hover:bg-muted transition-colors font-mono"
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              disabled={uploadingMedia}
              onClick={() => fileInputRef.current?.click()}
              title="Upload Image/Video/PDF"
              className="px-2 py-0.5 text-xs border rounded hover:bg-muted transition-colors font-mono flex items-center gap-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-850"
            >
              {uploadingMedia ? "Uploading..." : "📷 Upload Media"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="ml-auto flex items-center bg-muted p-0.5 rounded-lg border border-border">
              {(["edit", "split", "preview"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-2 py-1 text-xs rounded font-medium capitalize transition-colors ${
                    viewMode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Editor / Preview */}
          <div className="flex-1 overflow-hidden relative">
            {viewMode === "preview" && (
              <div
                className="h-full overflow-y-auto p-6 prose prose-sm dark:prose-invert max-w-none [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(editBody) }}
              />
            )}
            {viewMode === "edit" && (
              <textarea
                ref={bodyRef}
                id="wiki-body"
                value={editBody}
                onPaste={handlePaste}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder={`Write your page content in Markdown…\n\n## Introduction\n\nStart with a short summary…`}
                className="w-full h-full resize-none p-6 font-mono text-sm bg-background text-foreground border-0 outline-none focus:outline-none leading-relaxed"
                spellCheck={true}
              />
            )}
            {viewMode === "split" && (
              <div className="flex h-full divide-x divide-border">
                <textarea
                  ref={bodyRef}
                  id="wiki-body"
                  value={editBody}
                  onPaste={handlePaste}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder={`Write your page content in Markdown…`}
                  className="w-1/2 h-full resize-none p-6 font-mono text-sm bg-background text-foreground outline-none focus:outline-none leading-relaxed border-0 focus:ring-0"
                  spellCheck={true}
                />
                <div
                  className="w-1/2 h-full overflow-y-auto p-6 prose prose-sm dark:prose-invert max-w-none [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(editBody) }}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3 border-t flex-shrink-0 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {editBody.length.toLocaleString()} characters ·{" "}
              {editBody.split(/\s+/).filter(Boolean).length.toLocaleString()} words
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {createMutation.isPending || updateMutation.isPending ? "Saving…" : "Save Page"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete / Unpublish confirmation ───────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              The page will be hidden from <strong>docs.vaxplan.org</strong> immediately. The content is
              preserved in the database and can be re-published at any time using the eye icon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.slug)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unpublish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
