import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, X, Send, Bot, User as UserIcon, Loader2,
  DollarSign, AlertOctagon, TrendingUp, ClipboardCheck, Info
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
  engine?: "local" | "gemini";
}

const SAMPLE_QUESTIONS = [
  { text: "What is our total planned budget?", icon: DollarSign, color: "text-emerald-500" },
  { text: "Show me our zero-dose statistics", icon: AlertOctagon, color: "text-sky-500" },
  { text: "What is our Penta dropout rate?", icon: TrendingUp, color: "text-violet-500" },
  { text: "Summarize supportive supervision visits", icon: ClipboardCheck, color: "text-amber-500" }
];

export function AiCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 **Hello! I am your VaxPlan AI Copilot.**\n\nI can help you query live database indicators, budgets, and immunization statistics for your country. Feel free to ask a question or click one of the quick options below!",
      engine: "local"
    }
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const chatMutation = useMutation({
    /* Original Code: calling res.json() on parsed JSON object
    mutationFn: async (messageText: string) => {
      const res = (await apiRequest("POST", "/api/ai/chat", { message: messageText })) as any;
      return res.json() as Promise<{ text: string; engine: "local" | "gemini" }>;
    },
    */
    mutationFn: async (messageText: string) => {
      const res = (await apiRequest("POST", "/api/ai/chat", { message: messageText })) as any;
      return res as { text: string; engine: "local" | "gemini" };
    },
    onSuccess: (data, variables) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text, engine: data.engine }
      ]);
    },
    onError: (err: any) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ **Error:** ${err?.message || "Failed to communicate with VaxPlan Copilot. Please check your network or try again."}`,
          engine: "local"
        }
      ]);
    }
  });

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatMutation.isPending) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    chatMutation.mutate(trimmed);
  };

  return (
    <>
      {/* Floating Sparkle Toggle Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-600 hover:from-violet-700 hover:to-sky-700 text-white shadow-xl shadow-indigo-500/30 border border-white/20 transition-all duration-300 hover:scale-105 active:scale-95 z-50 flex items-center justify-center"
          data-testid="copilot-toggle-btn"
          aria-label="Open AI Copilot"
        >
          <Sparkles className="h-6 w-6 animate-pulse" />
        </Button>
      )}

      {/* Slide-out / Floating Chat Panel */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl shadow-indigo-950/20 border-border/80 bg-background/95 backdrop-blur-md transition-all duration-300 scale-100 origin-bottom-right z-50 overflow-hidden">
          {/* Header */}
          <CardHeader className="p-4 border-b border-border/60 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-sky-500/10 flex flex-row items-center justify-between space-y-0 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  VaxPlan Copilot
                </CardTitle>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Analytical assistant for reporting data
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen(false)}
                data-testid="copilot-close-btn"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 bg-muted/20">
            <div className="space-y-4 pr-1.5">
              {messages.map((msg, idx) => {
                const isBot = msg.role === "assistant";
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${!isBot ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${
                      isBot
                        ? "bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400"
                        : "bg-primary/10 border-primary/20 text-primary"
                    }`}>
                      {isBot ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                    </div>

                    <div className="flex flex-col gap-1 max-w-[80%]">
                      <div className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed border ${
                        isBot
                          ? "bg-card border-border text-foreground rounded-tl-sm"
                          : "bg-gradient-to-r from-violet-600 to-indigo-600 border-indigo-700 text-white rounded-tr-sm"
                      }`}>
                        <div className="prose prose-xs dark:prose-invert max-w-none break-words space-y-1.5 [&_table]:border [&_table]:border-collapse [&_table]:my-2 [&_th]:bg-muted/70 [&_th]:px-2 [&_th]:py-1 [&_th]:border [&_td]:px-2 [&_td]:py-1 [&_td]:border [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* Engine Label Badge */}
                      {isBot && msg.engine && (
                        <span className="text-[9px] text-muted-foreground/80 self-start flex items-center gap-1 px-1">
                          <Info className="h-3 w-3 shrink-0" />
                          Powered by {
                            msg.engine === "gemini"
                              ? <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">Gemini AI</Badge>
                              : <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">Local DB Engine</Badge>
                          }
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Chat Mutation Loading State */}
              {chatMutation.isPending && (
                <div className="flex items-start gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-card border text-xs shadow-sm flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>Querying database metrics...</span>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Quick-Ask Option Buttons */}
          {messages.length === 1 && !chatMutation.isPending && (
            <div className="px-4 py-3 bg-muted/10 border-t border-border/60 shrink-0 grid grid-cols-2 gap-2">
              {SAMPLE_QUESTIONS.map((q, idx) => {
                const Icon = q.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(q.text)}
                    className="flex flex-col text-left p-2.5 rounded-lg border border-border bg-card/50 hover:bg-accent/60 transition-colors text-[11px] font-medium gap-1.5 shadow-sm group hover:border-primary/30"
                  >
                    <Icon className={`h-4 w-4 ${q.color} shrink-0`} />
                    <span className="text-foreground/90 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {q.text}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Input Form Footer */}
          <CardFooter className="p-3 border-t border-border/60 bg-card/30 shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
              className="flex w-full items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask VaxPlan Copilot..."
                disabled={chatMutation.isPending}
                className="flex-1 h-9 text-xs focus-visible:ring-primary/50"
                data-testid="copilot-input-field"
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm shrink-0"
                disabled={!input.trim() || chatMutation.isPending}
                data-testid="copilot-send-btn"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
