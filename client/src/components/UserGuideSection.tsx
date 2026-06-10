import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen, Download, Search, Sparkles } from "lucide-react";
import guideContent from "../../../docs/USER_GUIDE.md?raw";
import quickstartContent from "../../../docs/QUICKSTART_FACILITY.md?raw";

interface Section {
  id: string;
  title: string;
  level: number;
  body: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function splitIntoSections(md: string): Section[] {
  // Strip the leading H1 + intro (everything before the first H2).
  const lines = md.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      if (current) sections.push(current);
      current = { id: slugify(h2[1]), title: h2[1], level: 2, body: "" };
      continue;
    }
    if (current) current.body += line + "\n";
  }
  if (current) sections.push(current);
  // Drop the "Table of Contents" section since the accordion is the ToC.
  return sections.filter((s) => !/table of contents/i.test(s.title));
}

interface Props {
  isFacilityRole: boolean;
}

export default function UserGuideSection({ isFacilityRole }: Props) {
  const sections = useMemo(() => splitIntoSections(guideContent), []);
  const [query, setQuery] = useState("");
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q),
    );
  }, [sections, query]);

  return (
    <div className="space-y-6">
      {isFacilityRole && (
        <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-sky-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                Facility Quick-Start
                <Badge variant="secondary" className="ml-1 text-xs">
                  Print this card
                </Badge>
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                data-testid="btn-print-quickstart"
              >
                Print
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <article className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {quickstartContent}
              </ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                VaxPlan End-User Guide
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Role-by-role manual. Pick a section, or search across the
                whole guide.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              data-testid="btn-download-guide-pdf"
              onClick={async () => {
                // Prefer the pre-built static PDF; fall back to browser print.
                try {
                  const res = await fetch("/VaxPlan-User-Guide.pdf", { method: "HEAD" });
                  if (res.ok) {
                    const a = document.createElement("a");
                    a.href = "/VaxPlan-User-Guide.pdf";
                    a.download = "VaxPlan-User-Guide.pdf";
                    a.click();
                  } else {
                    window.print();
                  }
                } catch {
                  window.print();
                }
              }}
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>

          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
            />
            <label htmlFor="guide-search" className="sr-only">
              Search the VaxPlan user guide
            </label>
            <Input
              id="guide-search"
              aria-label="Search the VaxPlan user guide"
              placeholder="Search the guide (e.g. defaulter, stock, microplan, GeoJSON)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
              data-testid="input-guide-search"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No sections match "{query}".
            </p>
          ) : (
            <Accordion
              type="single"
              collapsible
              value={openItem}
              onValueChange={setOpenItem}
            >
              {filtered.map((s) => (
                <AccordionItem key={s.id} value={s.id}>
                  <AccordionTrigger className="text-sm hover:no-underline text-left">
                    {s.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <article className="prose prose-sm max-w-none dark:prose-invert pt-2 overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_table]:whitespace-nowrap [&_table]:max-w-full">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {s.body}
                      </ReactMarkdown>
                    </article>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
