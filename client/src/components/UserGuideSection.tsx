import { useMemo, useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  Download,
  Search,
  Sparkles,
  CheckCircle2,
  Trophy,
  Award,
  HelpCircle,
  X,
  Lock,
} from "lucide-react";
import guideContent from "../../../docs/USER_GUIDE.md?raw";
import quickstartContent from "../../../docs/QUICKSTART_FACILITY.md?raw";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  title: string;
  level: number;
  body: string;
}

interface BadgeConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizConfig {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

// ── Configuration Data ─────────────────────────────────────────────────────────

const BADGES: BadgeConfig[] = [
  { id: "quickstart", name: "Quick-Start Pro", description: "Read the Facility Quick-Start guide.", icon: "⚡", color: "from-amber-400 to-orange-500" },
  { id: "gis_intel", name: "GIS Navigator", description: "Complete the Settlement Intelligence section and pass the quiz.", icon: "🛰️", color: "from-sky-400 to-indigo-500" },
  { id: "routine_plan", name: "Field Commander", description: "Complete the Routine Microplanning section and pass the quiz.", icon: "🗺️", color: "from-emerald-400 to-teal-500" },
  { id: "scholar", name: "Wiki Scholar", description: "Mark all available wiki user guide sections as read.", icon: "🎓", color: "from-violet-400 to-purple-500" },
];

const QUIZZES: Record<string, QuizConfig> = {
  "11-settlement-intelligence-and-zero-dose-targeting": {
    id: "gis_intel",
    title: "Settlement Intelligence & Zero-Dose Quiz",
    questions: [
      {
        question: "What does the Outreach Site Suitability Score represent?",
        options: [
          "The percentage of completed supervision visits.",
          "An abstract population density indicator.",
          "A 0-100 score prioritizing unserved building clusters based on size, zero-dose risk, distance, and road travel time."
        ],
        correctAnswer: 2,
        explanation: "The Outreach Site Suitability Score aggregates multiple factors (unserved size, zero-dose children, distance, accessibility) to help planners choose the optimal location for new outreach sessions."
      },
      {
        question: "What is the spatial resolution of the WorldPop gridded population data in VaxPlan?",
        options: [
          "100 meters × 100 meters (approx. 1 hectare)",
          "1 kilometer × 1 kilometer",
          "5 kilometers × 5 kilometers"
        ],
        correctAnswer: 0,
        explanation: "VaxPlan fuses high-resolution WorldPop raster data, which maps population density at 100m grid cells, letting planners click the map and get a precise headcount of people."
      }
    ]
  },
  "5-facility-staff--your-daily-workflow": {
    id: "routine_plan",
    title: "Routine Microplanning Quiz",
    questions: [
      {
        question: "How far in advance must a vaccination session date be scheduled?",
        options: [
          "At least 24 hours in advance",
          "At least 7 days in advance",
          "No advance scheduling is required"
        ],
        correctAnswer: 1,
        explanation: "To allow for logistics and cold chain planning, all itinerary days must be scheduled at least 7 days in the future."
      },
      {
        question: "Which role is responsible for reviewing and approving microplans?",
        options: [
          "Facility Clerks",
          "WHO external monitors only",
          "District Managers and Provincial Coordinators"
        ],
        correctAnswer: 2,
        explanation: "Authoring is done at the facility level, while review and approvals are routed hierarchically to District Managers and Provincial Coordinators."
      }
    ]
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function splitIntoSections(md: string): Section[] {
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
  return sections.filter((s) => !/table of contents/i.test(s.title));
}

interface Props {
  isFacilityRole: boolean;
}

export default function UserGuideSection({ isFacilityRole }: Props) {
  // Static markdown fallback
  const fallbackSections = useMemo(() => splitIntoSections(guideContent), []);

  // ── States ──────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);
  const [readSections, setReadSections] = useState<string[]>([]);
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizChecked, setQuizChecked] = useState<Record<string, boolean>>({});
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Load progress and achievements from local storage
  useEffect(() => {
    try {
      const savedRead = localStorage.getItem("vaxplan.docs.readSections");
      if (savedRead) setReadSections(JSON.parse(savedRead));

      const savedQuizzes = localStorage.getItem("vaxplan.quizzes.completed");
      if (savedQuizzes) setCompletedQuizzes(JSON.parse(savedQuizzes));
    } catch {
      /* ignore */
    }
  }, []);

  // Save read sections progress helper
  const persistRead = (updated: string[]) => {
    setReadSections(updated);
    try {
      localStorage.setItem("vaxplan.docs.readSections", JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  // ── Dynamic Wiki Page Queries ───────────────────────────────────────────────
  const { data: wikiPages = [], isLoading: wikiListLoading } = useQuery({
    queryKey: ["/api/wiki/pages"],
    queryFn: async () => {
      const res = await fetch("/api/wiki/pages");
      if (!res.ok) throw new Error("Failed to fetch wiki list");
      const json = await res.json();
      return json.data as { id: number; slug: string; title: string; sort_order: number }[];
    },
    retry: 1,
  });

  const { data: activePageBody } = useQuery({
    queryKey: ["/api/wiki/pages", openItem],
    queryFn: async () => {
      if (!openItem || openItem === "quickstart") return null;
      const res = await fetch(`/api/wiki/pages/${encodeURIComponent(openItem)}`);
      if (!res.ok) throw new Error("Failed to fetch page body");
      const json = await res.json();
      return json.data as { body: string };
    },
    enabled: !!openItem && openItem !== "quickstart" && wikiPages.some(p => p.slug === openItem),
  });

  // Combine dynamic wiki pages with fallback static pages (offline-first architecture)
  const combinedSections = useMemo(() => {
    if (wikiPages.length === 0) {
      return fallbackSections;
    }
    // Map list of dynamic pages
    return wikiPages.map(wp => {
      // Find fallback text in case dynamic body is loading or fails
      const fallback = fallbackSections.find(s => s.id === wp.slug);
      return {
        id: wp.slug,
        title: wp.title,
        level: 2,
        body: wp.slug === openItem && activePageBody?.body ? activePageBody.body : (fallback?.body ?? ""),
      };
    });
  }, [wikiPages, fallbackSections, openItem, activePageBody]);

  // Filter sections by search query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return combinedSections;
    return combinedSections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q),
    );
  }, [combinedSections, query]);

  // ── Reading progress stats ──────────────────────────────────────────────────
  const progressPercent = useMemo(() => {
    const total = combinedSections.length + (isFacilityRole ? 1 : 0); // Include quickstart if active
    if (total === 0) return 0;
    
    let readCount = readSections.filter(id => id === "quickstart" || combinedSections.some(s => s.id === id)).length;
    return Math.round((readCount / total) * 100);
  }, [combinedSections, readSections, isFacilityRole]);

  // Unlocked Badges calculator
  const unlockedBadges = useMemo(() => {
    const unlocked: string[] = [];
    
    // 1. Quick-Start Badge
    if (readSections.includes("quickstart")) unlocked.push("quickstart");

    // 2. GIS Intel Badge
    if (completedQuizzes.includes("gis_intel")) unlocked.push("gis_intel");

    // 3. Routine Plan Badge
    if (completedQuizzes.includes("routine_plan")) unlocked.push("routine_plan");

    // 4. Scholar Badge (all sections read)
    const allRead = combinedSections.length > 0 && combinedSections.every(s => readSections.includes(s.id));
    if (allRead) unlocked.push("scholar");

    return unlocked;
  }, [readSections, completedQuizzes, combinedSections]);

  const toggleSectionRead = (sectionId: string) => {
    let updated: string[];
    if (readSections.includes(sectionId)) {
      updated = readSections.filter(id => id !== sectionId);
    } else {
      updated = [...readSections, sectionId];
    }
    persistRead(updated);
  };

  // ── Quiz actions ────────────────────────────────────────────────────────────
  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    setQuizAnswers(prev => ({ ...prev, [`${openItem}-${questionIdx}`]: optionIdx }));
    setQuizChecked(prev => ({ ...prev, [`${openItem}-${questionIdx}`]: false }));
  };

  const checkQuiz = (sectionId: string, quizConfig: QuizConfig) => {
    let allCorrect = true;
    quizConfig.questions.forEach((q, idx) => {
      const selected = quizAnswers[`${sectionId}-${idx}`];
      if (selected !== q.correctAnswer) {
        allCorrect = false;
      }
      setQuizChecked(prev => ({ ...prev, [`${sectionId}-${idx}`]: true }));
    });

    if (allCorrect) {
      if (!completedQuizzes.includes(quizConfig.id)) {
        const updated = [...completedQuizzes, quizConfig.id];
        setCompletedQuizzes(updated);
        try {
          localStorage.setItem("vaxplan.quizzes.completed", JSON.stringify(updated));
        } catch { /* ignore */ }
      }
      // Also automatically mark the parent section as read
      if (!readSections.includes(sectionId)) {
        persistRead([...readSections, sectionId]);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Gamification Achievements Dashboard ─────────────────────────────────── */}
      <Card className="border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-indigo-500" />
                <h2 className="font-bold text-base">Your Learning Academy Progress</h2>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Modules Read: {readSections.length} of {combinedSections.length + (isFacilityRole ? 1 : 0)}</span>
                <span>{progressPercent}% Complete</span>
              </div>
              <Progress value={progressPercent} className="h-2 bg-muted-foreground/15" />
            </div>

            <div className="border-t md:border-t-0 md:border-l border-indigo-500/10 pt-4 md:pt-0 md:pl-6">
              <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Award className="h-4 w-4" /> Unlocked Badges ({unlockedBadges.length} / {BADGES.length})
              </div>
              <div className="flex gap-2 flex-wrap">
                {BADGES.map((badge) => {
                  const isUnlocked = unlockedBadges.includes(badge.id);
                  return (
                    <div
                      key={badge.id}
                      title={`${badge.name}: ${badge.description} (${isUnlocked ? "Unlocked" : "Locked"})`}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium select-none transition-all duration-300 ${
                        isUnlocked
                          ? `bg-gradient-to-r ${badge.color} text-white border-transparent shadow-sm scale-100 hover:scale-105`
                          : "bg-muted text-muted-foreground/60 border-muted-foreground/15 opacity-60"
                      }`}
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.name}</span>
                      {!isUnlocked && <Lock className="h-3 w-3 ml-0.5 opacity-60" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Facility Quick-Start Card ─────────────────────────────────────────── */}
      {isFacilityRole && (
        <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-sky-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                Facility Quick-Start
                {readSections.includes("quickstart") && (
                  <Badge variant="secondary" className="ml-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 flex items-center gap-0.5">
                    <CheckCircle2 className="h-3 w-3" /> Completed
                  </Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={readSections.includes("quickstart") ? "ghost" : "default"}
                  className={readSections.includes("quickstart") ? "text-muted-foreground text-xs" : "text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"}
                  onClick={() => {
                    const active = readSections.includes("quickstart");
                    persistRead(active ? readSections.filter(id => id !== "quickstart") : [...readSections, "quickstart"]);
                  }}
                >
                  {readSections.includes("quickstart") ? "Mark Unread" : "Mark as Read"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  data-testid="btn-print-quickstart"
                >
                  Print
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <article className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ src, alt }) => (
                    <img
                      src={src}
                      alt={alt}
                      className="rounded-lg shadow-md max-h-96 object-cover cursor-zoom-in transition-transform hover:scale-[1.01]"
                      onClick={() => setLightboxImg(src || null)}
                    />
                  )
                }}
              >
                {quickstartContent}
              </ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      )}

      {/* ── Main End-User Wiki Card ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                VaxPlan End-User Wiki Guide
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Live role-by-role training handbook. Read modules, submit quizzes, and earn badges.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              data-testid="btn-download-guide-pdf"
              onClick={async () => {
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
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {/* Search bar */}
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
            />
            <Input
              id="guide-search"
              placeholder="Search guide pages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
              data-testid="input-guide-search"
            />
          </div>

          {wikiListLoading && filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading wiki pages from database...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No matching pages found.
            </p>
          ) : (
            <Accordion
              type="single"
              collapsible
              value={openItem}
              onValueChange={setOpenItem}
            >
              {filtered.map((s) => {
                const isRead = readSections.includes(s.id);
                const quiz = QUIZZES[s.id];
                const isQuizCompleted = quiz && completedQuizzes.includes(quiz.id);

                return (
                  <AccordionItem key={s.id} value={s.id}>
                    <AccordionTrigger className="text-sm hover:no-underline text-left flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isRead ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 border rounded-full shrink-0 border-muted-foreground/30" />
                        )}
                        <span>{s.title}</span>
                      </div>
                      {quiz && (
                        <Badge variant="outline" className={`ml-2 text-[10px] uppercase font-semibold ${
                          isQuizCompleted
                            ? "bg-emerald-500/10 text-emerald-600 border-0"
                            : "bg-indigo-500/10 text-indigo-600 border-indigo-200"
                        }`}>
                          {isQuizCompleted ? "Quiz Passed ✅" : "Quiz Available 📝"}
                        </Badge>
                      )}
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      {/* Live Loading state for the body */}
                      {openItem === s.id && wikiPages.length > 0 && activePageBody === undefined ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          Loading page body...
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Markdown Page Body */}
                          <article className="prose prose-sm max-w-none dark:prose-invert overflow-x-auto [&_table]:block [&_table]:overflow-x-auto [&_table]:whitespace-nowrap [&_table]:max-w-full">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                img: ({ src, alt }) => (
                                  <img
                                    src={src}
                                    alt={alt}
                                    className="rounded-lg shadow-md max-h-96 object-cover cursor-zoom-in transition-transform hover:scale-[1.01]"
                                    onClick={() => setLightboxImg(src || null)}
                                  />
                                )
                              }}
                            >
                              {s.body}
                            </ReactMarkdown>
                          </article>

                          {/* ── Interactive Quiz Section ─────────────────────────────────── */}
                          {quiz && (
                            <div className="border border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-lg p-4 mt-6 space-y-4">
                              <div className="flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-indigo-500" />
                                <h4 className="font-bold text-sm text-foreground m-0">{quiz.title}</h4>
                              </div>
                              <div className="space-y-4 divide-y divide-indigo-500/5">
                                {quiz.questions.map((q, qIdx) => {
                                  const ansKey = `${s.id}-${qIdx}`;
                                  const selected = quizAnswers[ansKey];
                                  const checked = quizChecked[ansKey];
                                  const isCorrect = selected === q.correctAnswer;

                                  return (
                                    <div key={qIdx} className="pt-4 first:pt-0 space-y-2">
                                      <p className="text-xs font-semibold text-foreground">{qIdx + 1}. {q.question}</p>
                                      <div className="grid gap-2">
                                        {q.options.map((opt, optIdx) => (
                                          <button
                                            key={optIdx}
                                            type="button"
                                            disabled={isQuizCompleted}
                                            onClick={() => handleSelectOption(qIdx, optIdx)}
                                            className={`text-left text-xs px-3 py-2 border rounded-md transition-all ${
                                              selected === optIdx
                                                ? checked
                                                  ? isCorrect
                                                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-medium"
                                                    : "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 font-medium"
                                                  : "bg-indigo-500/15 border-indigo-500 font-medium"
                                                : "bg-background border-muted hover:bg-muted/40"
                                            }`}
                                          >
                                            {opt}
                                          </button>
                                        ))}
                                      </div>

                                      {/* Explanation / feedback */}
                                      {checked && (
                                        <div className={`text-xs p-2 rounded ${
                                          isCorrect ? "bg-emerald-500/5 text-emerald-600" : "bg-rose-500/5 text-rose-600"
                                        }`}>
                                          <strong>{isCorrect ? "Correct!" : "Incorrect."}</strong> {q.explanation}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {!isQuizCompleted ? (
                                <Button
                                  size="sm"
                                  onClick={() => checkQuiz(s.id, quiz)}
                                  className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                  Submit Quiz Answers
                                </Button>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5 py-1 text-emerald-500 text-xs font-semibold">
                                  <Trophy className="h-4 w-4" /> Quiz Completed successfully!
                                </div>
                              )}
                            </div>
                          )}

                          {/* Mark Read checkbox footer */}
                          <div className="flex justify-between items-center border-t pt-4 mt-6">
                            <span className="text-xs text-muted-foreground">
                              {isRead ? "You read this page ✅" : "Finished reading?"}
                            </span>
                            <Button
                              size="sm"
                              variant={isRead ? "outline" : "default"}
                              onClick={() => toggleSectionRead(s.id)}
                              className="text-xs"
                            >
                              {isRead ? "Mark Unread" : "Mark as Read"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* ── Image Lightbox Modal ────────────────────────────────────────────────── */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm"
        >
          <button
            type="button"
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2"
            onClick={() => setLightboxImg(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxImg}
            alt="Expanded view"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
