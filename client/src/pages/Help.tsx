import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Book,
  Video,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  FileText,
  Map,
  Users,
  Calendar,
  Syringe,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Tenant } from "@shared/schema";
import { useState } from "react";

const defaultFaqs = [
  {
    question: "How do I add a new health facility?",
    answer:
      "Navigate to the Facilities page from the sidebar. Click the 'Add Facility' button and fill in the required information including name, HMIS code, district, and GPS coordinates. After saving, the facility will appear in the registry and on the map.",
  },
  {
    question: "How does the population fusion work?",
    answer:
      "The system combines multiple population data sources (census, health registry, WorldPop estimates, and local surveys) using a weighted algorithm. Each source is given a confidence score, and the system calculates a best estimate based on data recency and reliability.",
  },
  {
    question: "What are the vaccine wastage rates used in calculations?",
    answer:
      "Each country tenant configures its own vaccine wastage rates. Defaults follow common national immunization program guidelines (e.g. BCG ~40%, MR ~25%, OPV ~25%, TT ~25%, Penta/PCV ~11%, IPV/Rota ~5%) and can be reviewed in the Vaccine Calculator.",
  },
  {
    question: "How do I submit data for approval?",
    answer:
      "After entering or updating data (population, sessions, budget), change the status to 'Submit for Approval'. The request will be routed to the appropriate level (District Manager, Provincial Coordinator, or National Admin) based on your role and the approval hierarchy.",
  },
  {
    question: "What makes a village 'Hard-to-Reach'?",
    answer:
      "Villages are classified as HTR based on a composite score considering: distance from facility, terrain difficulty, seasonal accessibility, and historical coverage rates. Each factor is weighted equally (25%) to calculate the final score.",
  },
  {
    question: "How does offline mode work?",
    answer:
      "The application caches essential data locally for offline use. You can view and edit data while offline, and changes will sync automatically when connectivity is restored. Check the sync indicator in the header to see your current status.",
  },
];

const quickLinks = [
  { title: "Facility Management", icon: Map, path: "/facilities" },
  { title: "Population Data", icon: Users, path: "/population" },
  { title: "Session Planning", icon: Calendar, path: "/sessions" },
  { title: "Vaccine Calculator", icon: Syringe, path: "/vaccines" },
];

const defaultSupport = {
  email: "support@health.gov",
  phone: "+675 301 3601",
  hours: "Monday - Friday, 8:00 AM - 4:00 PM (your local time)"
};

const defaultGuides = [
  {
    title: "Getting Started",
    description: "Basic navigation and setup",
    badge: "Beginner",
  },
  {
    title: "Data Entry Guide",
    description: "How to enter and validate data",
    badge: "Essential",
  },
  {
    title: "Map Operations",
    description: "Using the GIS mapping features",
    badge: "Intermediate",
  },
  {
    title: "Approval Workflows",
    description: "Understanding the approval process",
    badge: "Advanced",
  },
];

const defaultResources = [
  { name: "WHO Immunization Guidelines", url: "https://www.who.int/teams/immunization-vaccines-and-biologicals" },
  { name: "National Health Plan Guideline", url: "https://www.health.gov" },
  { name: "EPI Program Reference Manual", url: "https://www.cdc.gov/vaccines/imz-managers/index.html" },
];

const defaultVideos = [
  { title: "System Overview", duration: "5:30", url: "" },
  { title: "Adding Population Data", duration: "8:15", url: "" },
  { title: "Planning Vaccination Sessions", duration: "10:45", url: "" },
  { title: "Generating Reports", duration: "6:20", url: "" },
];

function SimulatedUpload({ onUploadComplete, initialUrl = "" }: { onUploadComplete: (url: string) => void; initialUrl?: string }) {
  const [uploading, setUploading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const { toast } = useToast();

  const handleUpload = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      const randomId = Math.floor(Math.random() * 10000);
      const generatedUrl = `/uploads/ref_document_${randomId}.pdf`;
      setCurrentUrl(generatedUrl);
      onUploadComplete(generatedUrl);
      toast({
        title: "Upload Successful",
        description: `Simulated upload complete: ${generatedUrl}`,
      });
    }, 800);
  };

  return (
    <div className="flex items-center gap-3">
      <Input
        value={currentUrl}
        onChange={(e) => {
          setCurrentUrl(e.target.value);
          onUploadComplete(e.target.value);
        }}
        placeholder="No document URL or upload path specified"
        className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
      />
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={handleUpload}
        className="rounded-xl flex-shrink-0"
      >
        {uploading ? "Uploading..." : "Simulate Upload"}
      </Button>
    </div>
  );
}

export default function Help() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/me/tenant"],
    retry: false,
  });

  const helpSettings = (tenant?.settings as any)?.help || {};
  const faqs = helpSettings.faqs || defaultFaqs;
  const support = helpSettings.support || defaultSupport;
  const guides = helpSettings.guides || defaultGuides;
  const resources = helpSettings.resources || defaultResources;
  const videos = helpSettings.videos || defaultVideos;

  const isNationalAdmin = user?.role === "national_admin";

  const updateSettings = useMutation({
    mutationFn: async (updatedFields: Partial<Tenant>) => {
      const response = await apiRequest("PATCH", "/api/me/tenant", updatedFields);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/tenant"] });
      toast({
        title: "Help Center Configuration Saved",
        description: "Help resources, guides, support details, and FAQs updated successfully.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Modal toggle states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [isSupportEditOpen, setIsSupportEditOpen] = useState(false);

  const [isGuideAddOpen, setIsGuideAddOpen] = useState(false);
  const [isGuideEditOpen, setIsGuideEditOpen] = useState(false);
  const [editingGuideIndex, setEditingGuideIndex] = useState<number | null>(null);

  const [isResourceAddOpen, setIsResourceAddOpen] = useState(false);
  const [isResourceEditOpen, setIsResourceEditOpen] = useState(false);
  const [editingResourceIndex, setEditingResourceIndex] = useState<number | null>(null);

  const [isVideoAddOpen, setIsVideoAddOpen] = useState(false);
  const [isVideoEditOpen, setIsVideoEditOpen] = useState(false);
  const [editingVideoIndex, setEditingVideoIndex] = useState<number | null>(null);

  // Form states (Faq)
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [faqDocUrl, setFaqDocUrl] = useState("");

  // Form states (Support)
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [supportHours, setSupportHours] = useState("");

  // Form states (Guide)
  const [guideTitle, setGuideTitle] = useState("");
  const [guideDesc, setGuideDesc] = useState("");
  const [guideBadge, setGuideBadge] = useState("");
  const [guideDocUrl, setGuideDocUrl] = useState("");

  // Form states (Resource)
  const [resourceName, setResourceName] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");

  // Form states (Video)
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // FAQ CRUD handlers
  const handleAddFaq = () => {
    if (!question.trim() || !answer.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill out both the question and the answer.",
        variant: "destructive",
      });
      return;
    }
    const updatedFaqs = [...faqs, { question, answer, documentUrl: faqDocUrl }];
    const updatedSettings = {
      ...(tenant?.settings as any),
      help: {
        ...helpSettings,
        faqs: updatedFaqs,
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
    setIsAddOpen(false);
    setQuestion("");
    setAnswer("");
    setFaqDocUrl("");
  };

  const handleEditFaq = () => {
    if (editingIndex === null || !question.trim() || !answer.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill out both the question and the answer.",
        variant: "destructive",
      });
      return;
    }
    const updatedFaqs = [...faqs];
    updatedFaqs[editingIndex] = { question, answer, documentUrl: faqDocUrl };
    const updatedSettings = {
      ...(tenant?.settings as any),
      help: {
        ...helpSettings,
        faqs: updatedFaqs,
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
    setIsEditOpen(false);
    setEditingIndex(null);
    setQuestion("");
    setAnswer("");
    setFaqDocUrl("");
  };

  const handleDeleteFaq = (index: number) => {
    const updatedFaqs = faqs.filter((_: any, idx: number) => idx !== index);
    const updatedSettings = {
      ...(tenant?.settings as any),
      help: {
        ...helpSettings,
        faqs: updatedFaqs,
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
  };

  // Support CRUD handler
  const handleEditSupport = () => {
    if (!supportEmail.trim() || !supportPhone.trim()) {
      toast({
        title: "Validation Error",
        description: "Please supply both support email and phone number.",
        variant: "destructive",
      });
      return;
    }
    const updatedSettings = {
      ...(tenant?.settings as any),
      help: {
        ...helpSettings,
        support: { email: supportEmail, phone: supportPhone, hours: supportHours },
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
    setIsSupportEditOpen(false);
  };

  // Guide CRUD handlers
  const handleAddGuide = () => {
    if (!guideTitle.trim() || !guideDesc.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill out both the guide title and description.",
        variant: "destructive",
      });
      return;
    }
    const updatedGuides = [...guides, { title: guideTitle, description: guideDesc, badge: guideBadge || "Beginner", documentUrl: guideDocUrl }];
    const updatedSettings = {
      ...(tenant?.settings as any),
      help: {
        ...helpSettings,
        guides: updatedGuides,
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
    setIsGuideAddOpen(false);
    setGuideTitle("");
    setGuideDesc("");
    setGuideBadge("");
    setGuideDocUrl("");
  };

  const handleEditGuide = () => {
    if (editingGuideIndex === null || !guideTitle.trim() || !guideDesc.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill out both the guide title and description.",
        variant: "destructive",
      });
      return;
    }
    const updatedGuides = [...guides];
    updatedGuides[editingGuideIndex] = { title: guideTitle, description: guideDesc, badge: guideBadge || "Beginner", documentUrl: guideDocUrl };
    const updatedSettings = {
      ...(tenant?.settings as any),
      help: {
        ...helpSettings,
        guides: updatedGuides,
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
    setIsGuideEditOpen(false);
    setEditingGuideIndex(null);
    setGuideTitle("");
    setGuideDesc("");
    setGuideBadge("");
    setGuideDocUrl("");
  };

  const handleDeleteGuide = (index: number) => {
    const updatedGuides = guides.filter((_: any, idx: number) => idx !== index);
    const updatedSettings = {
      ...(tenant?.settings as any),
      help: {
        ...helpSettings,
        guides: updatedGuides,
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
  };

  // Resources CRUD handlers
  const handleAddResource = () => {
    if (!resourceName.trim() || !resourceUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill out both the resource name and URL link.",
        variant: "destructive",
      });
      return;
    }
    const updatedResources = [...resources, { name: resourceName, url: resourceUrl }];
    const updatedSettings = {
      ...(tenant?.settings as any),
      help: {
        ...helpSettings,
        resources: updatedResources,
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
    setIsResourceAddOpen(false);
    setResourceName("");
    setResourceUrl("");
  };

  const handleEditResource = () => {
    if (editingResourceIndex === null || !resourceName.trim() || !resourceUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill out both the resource name and URL link.",
        variant: "destructive",
      });
      return;
    }
    const updatedResources = [...resources];
    updatedResources[editingResourceIndex] = { name: resourceName, url: resourceUrl };
    const updatedSettings = {
      ...(tenant?.settings as any),
      help: {
        ...helpSettings,
        resources: updatedResources,
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
    setIsResourceEditOpen(false);
    setEditingResourceIndex(null);
    setResourceName("");
    setResourceUrl("");
  };

  const handleDeleteResource = (index: number) => {
    const updatedResources = resources.filter((_: any, idx: number) => idx !== index);
    const updatedSettings = {
      ...(tenant?.settings as any),
      help: {
        ...helpSettings,
        resources: updatedResources,
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
  };

  // Video CRUD handlers
  const handleAddVideo = () => {
    if (!videoTitle.trim() || !videoDuration.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill out both the video title and duration.",
        variant: "destructive",
      });
      return;
    }
    const updatedVideos = [...videos, { title: videoTitle, duration: videoDuration, url: videoUrl }];
    const updatedSettings = {
      ...(tenant?.settings as any),
      help: {
        ...helpSettings,
        videos: updatedVideos,
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
    setIsVideoAddOpen(false);
    setVideoTitle("");
    setVideoDuration("");
    setVideoUrl("");
  };

  const handleEditVideo = () => {
    if (editingVideoIndex === null || !videoTitle.trim() || !videoDuration.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill out both the video title and duration.",
        variant: "destructive",
      });
      return;
    }
    const updatedVideos = [...videos];
    updatedVideos[editingVideoIndex] = { title: videoTitle, duration: videoDuration, url: videoUrl };
    const updatedSettings = {
      ...(tenant?.settings as any),
      help: {
        ...helpSettings,
        videos: updatedVideos,
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
    setIsVideoEditOpen(false);
    setEditingVideoIndex(null);
    setVideoTitle("");
    setVideoDuration("");
    setVideoUrl("");
  };

  const handleDeleteVideo = (index: number) => {
    const updatedVideos = videos.filter((_: any, idx: number) => idx !== index);
    const updatedSettings = {
      ...(tenant?.settings as any),
      help: {
        ...helpSettings,
        videos: updatedVideos,
      },
    };
    updateSettings.mutate({ settings: updatedSettings });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Help & Support Hub</h1>
        <p className="text-muted-foreground text-sm">
          Find answers, review guides, access external WHO resources, and get assistance with VaxPlan
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* FAQ Knowledge Base Card */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <HelpCircle className="h-5 w-5 text-indigo-500" />
                    Knowledge Base FAQ Module
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Direct access to dynamic troubleshooting FAQs and answers.
                  </p>
                </div>
                {isNationalAdmin && (
                  <Button
                    size="sm"
                    className="h-8 font-semibold flex items-center gap-1.5"
                    onClick={() => {
                      setQuestion("");
                      setAnswer("");
                      setIsAddOpen(true);
                    }}
                    data-testid="btn-add-faq"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add FAQ
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {faqs.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No FAQs configured for this country.
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq: any, index: number) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className="text-left text-sm font-medium hover:text-indigo-500 dark:hover:text-indigo-400">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground space-y-3 pt-1">
                        <p className="leading-relaxed text-foreground/80">{faq.answer}</p>
                        {faq.documentUrl && (
                          <div className="mt-2">
                            <a
                              href={faq.documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-600 hover:underline mt-1"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              View Reference Attachment Document
                            </a>
                          </div>
                        )}
                        {isNationalAdmin && (
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                              onClick={() => {
                                setEditingIndex(index);
                                setQuestion(faq.question);
                                setAnswer(faq.answer);
                                setFaqDocUrl(faq.documentUrl || "");
                                setIsEditOpen(true);
                              }}
                              data-testid={`btn-edit-faq-${index}`}
                            >
                              <Edit className="h-3 w-3" />
                              Edit FAQ
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 flex items-center gap-1"
                              onClick={() => handleDeleteFaq(index)}
                              data-testid={`btn-delete-faq-${index}`}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>

          {/* User Guides Card */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Book className="h-5 w-5 text-indigo-500" />
                    User Guides
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Download and read instructions for program staff.
                  </p>
                </div>
                {isNationalAdmin && (
                  <Button
                    size="sm"
                    className="h-8 font-semibold flex items-center gap-1.5"
                    onClick={() => {
                      setGuideTitle("");
                      setGuideDesc("");
                      setGuideBadge("Beginner");
                      setIsGuideAddOpen(true);
                    }}
                    data-testid="btn-add-guide"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Guide
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {guides.map((guide: any, index: number) => (
                  <div
                    key={index}
                    className="relative p-4 rounded-xl border hover:bg-muted/10 transition-all duration-200 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <FileText className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded">
                            {guide.badge}
                          </Badge>
                          {isNationalAdmin && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity duration-150">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingGuideIndex(index);
                                  setGuideTitle(guide.title);
                                  setGuideDesc(guide.description);
                                  setGuideBadge(guide.badge);
                                  setGuideDocUrl(guide.documentUrl || "");
                                  setIsGuideEditOpen(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGuide(index);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold text-sm text-foreground">{guide.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {guide.description}
                      </p>
                      {guide.documentUrl && (
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/10 flex items-center gap-1.5 rounded-lg"
                            onClick={() => window.open(guide.documentUrl, "_blank")}
                          >
                            <FileText className="h-3 w-3" />
                            View Reference Document
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
 
          {/* Video Tutorials Card */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Video className="h-5 w-5 text-indigo-500" />
                    Video Tutorials
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Watch and learn from instructional video walk-throughs.
                  </p>
                </div>
                {isNationalAdmin && (
                  <Button
                    size="sm"
                    className="h-8 font-semibold flex items-center gap-1.5"
                    onClick={() => {
                      setVideoTitle("");
                      setVideoDuration("");
                      setVideoUrl("");
                      setIsVideoAddOpen(true);
                    }}
                    data-testid="btn-add-video"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Video
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {videos.map((video: any, index: number) => (
                  <div
                    key={index}
                    className="group flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Video className="h-4 w-4 text-indigo-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-foreground">{video.title}</span>
                        {video.url && (
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-indigo-500 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            Watch Video Asset
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-semibold">
                        {video.duration}
                      </Badge>
                      {isNationalAdmin && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity duration-150">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditingVideoIndex(index);
                              setVideoTitle(video.title);
                              setVideoDuration(video.duration);
                              setVideoUrl(video.url || "");
                              setIsVideoEditOpen(true);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteVideo(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickLinks.map((link) => (
                <Button
                  key={link.path}
                  variant="ghost"
                  className="w-full justify-start text-foreground/80 hover:text-foreground"
                  onClick={() => setLocation(link.path)}
                  data-testid={`link-${link.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <link.icon className="h-4 w-4 mr-2 text-indigo-500" />
                  {link.title}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Support Support Card */}
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <MessageCircle className="h-5 w-5 text-indigo-500" />
                Contact Support
              </CardTitle>
              {isNationalAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSupportEmail(support.email);
                    setSupportPhone(support.phone);
                    setSupportHours(support.hours || "");
                    setIsSupportEditOpen(true);
                  }}
                  data-testid="btn-edit-support"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{support.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{support.phone}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Support hours: {support.hours}
              </p>
              <Button className="w-full" data-testid="button-contact-support" onClick={() => window.location.href = `mailto:${support.email}`}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </CardContent>
          </Card>

          {/* External Resources Card */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-lg text-foreground">External Resources</CardTitle>
                {isNationalAdmin && (
                  <Button
                    size="sm"
                    className="h-8 font-semibold flex items-center gap-1.5"
                    onClick={() => {
                      setResourceName("");
                      setResourceUrl("");
                      setIsResourceAddOpen(true);
                    }}
                    data-testid="btn-add-resource"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Link
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              {resources.map((resource: any, index: number) => (
                <div key={index} className="flex items-center gap-2 w-full group">
                  <Button
                    variant="outline"
                    className="flex-1 justify-between text-left truncate text-foreground hover:bg-muted/30"
                    onClick={() => window.open(resource.url, "_blank")}
                    data-testid={`link-${resource.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <span className="text-sm truncate">{resource.name}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  </Button>
                  {isNationalAdmin && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingResourceIndex(index);
                          setResourceName(resource.name);
                          setResourceUrl(resource.url);
                          setIsResourceEditOpen(true);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteResource(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* System Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { service: "Application", status: "Operational" },
                  { service: "Database", status: "Operational" },
                  { service: "Map Services", status: "Operational" },
                  { service: "Sync Service", status: "Operational" },
                ].map((item) => (
                  <div
                    key={item.service}
                    className="flex items-center justify-between text-sm text-foreground"
                  >
                    <span>{item.service}</span>
                    <Badge
                      variant="outline"
                      className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Support Modal */}
      <Dialog open={isSupportEditOpen} onOpenChange={setIsSupportEditOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-indigo-500" />
              Edit Support Contact Information
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Modify the central help desk email and phone support details. Changes are persisted into the active tenant's settings database.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="support-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Support Email
              </Label>
              <Input
                id="support-email"
                placeholder="e.g. support@health.gov"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="support-phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Support Phone Number
              </Label>
              <Input
                id="support-phone"
                placeholder="e.g. +675 301 3601"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="support-hours" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Working Support Hours
              </Label>
              <Input
                id="support-hours"
                placeholder="e.g. Monday - Friday, 8:00 AM - 4:00 PM"
                value={supportHours}
                onChange={(e) => setSupportHours(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setIsSupportEditOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleEditSupport} disabled={updateSettings.isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
              {updateSettings.isPending ? "Saving..." : "Save Support Info"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add FAQ Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-indigo-500" />
              Add Help FAQ
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Configure a new frequently asked question. It will be saved into the PostgreSQL settings table for this tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="add-question" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Question
              </Label>
              <Input
                id="add-question"
                placeholder="e.g. How do I request a new user role?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                data-testid="input-faq-question"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-answer" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Answer
              </Label>
              <Textarea
                id="add-answer"
                placeholder="Provide a detailed instructions answer..."
                value={answer}
                rows={5}
                onChange={(e) => setAnswer(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                data-testid="input-faq-answer"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-faq-doc-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reference Document Attachment URL
              </Label>
              <SimulatedUpload
                initialUrl={faqDocUrl}
                onUploadComplete={(url) => setFaqDocUrl(url)}
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAddFaq} disabled={updateSettings.isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
              {updateSettings.isPending ? "Adding..." : "Add FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Edit FAQ Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-indigo-500" />
              Edit Help FAQ
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Modify this frequently asked question. Changes will reflect instantly inside the system Help Center.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="edit-question" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Question
              </Label>
              <Input
                id="edit-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                data-testid="edit-faq-question"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-answer" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Answer
              </Label>
              <Textarea
                id="edit-answer"
                value={answer}
                rows={5}
                onChange={(e) => setAnswer(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                data-testid="edit-faq-answer"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-faq-doc-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reference Document Attachment URL
              </Label>
              <SimulatedUpload
                initialUrl={faqDocUrl}
                onUploadComplete={(url) => setFaqDocUrl(url)}
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditingIndex(null); }} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleEditFaq} disabled={updateSettings.isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Add Guide Dialog */}
      <Dialog open={isGuideAddOpen} onOpenChange={setIsGuideAddOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Book className="h-5 w-5 text-indigo-500" />
              Add User Guide
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Configure a new instructional booklet or guide card for active VaxPlan platform users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="guide-add-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Guide Title
              </Label>
              <Input
                id="guide-add-title"
                placeholder="e.g. Microplanning Reference Manual"
                value={guideTitle}
                onChange={(e) => setGuideTitle(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="guide-add-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </Label>
              <Textarea
                id="guide-add-desc"
                placeholder="e.g. Detailed step-by-step for GIS operations..."
                value={guideDesc}
                onChange={(e) => setGuideDesc(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="guide-add-badge" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Difficulty Badge
              </Label>
              <Input
                id="guide-add-badge"
                placeholder="e.g. Essential, Intermediate, Advanced"
                value={guideBadge}
                onChange={(e) => setGuideBadge(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="guide-add-doc-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Upload Guide Reference Document URL
              </Label>
              <SimulatedUpload
                initialUrl={guideDocUrl}
                onUploadComplete={(url) => setGuideDocUrl(url)}
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setIsGuideAddOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAddGuide} disabled={updateSettings.isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
              {updateSettings.isPending ? "Adding..." : "Add Guide"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Edit Guide Dialog */}
      <Dialog open={isGuideEditOpen} onOpenChange={setIsGuideEditOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Book className="h-5 w-5 text-indigo-500" />
              Edit User Guide
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Modify the title, description, or target badge level of this instructional user guide card.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="guide-edit-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Guide Title
              </Label>
              <Input
                id="guide-edit-title"
                value={guideTitle}
                onChange={(e) => setGuideTitle(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="guide-edit-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </Label>
              <Textarea
                id="guide-edit-desc"
                value={guideDesc}
                onChange={(e) => setGuideDesc(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="guide-edit-badge" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Difficulty Badge
              </Label>
              <Input
                id="guide-edit-badge"
                value={guideBadge}
                onChange={(e) => setGuideBadge(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="guide-edit-doc-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Upload Guide Reference Document URL
              </Label>
              <SimulatedUpload
                initialUrl={guideDocUrl}
                onUploadComplete={(url) => setGuideDocUrl(url)}
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => { setIsGuideEditOpen(false); setEditingGuideIndex(null); }} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleEditGuide} disabled={updateSettings.isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Resource Dialog */}
      <Dialog open={isResourceAddOpen} onOpenChange={setIsResourceAddOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-indigo-500" />
              Add External Resource Link
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Provide a name and valid web hyperlink reference pointing to official guidelines or reference materials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="resource-add-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resource Name
              </Label>
              <Input
                id="resource-add-name"
                placeholder="e.g. WHO Immunization Reference Guidelines"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="resource-add-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                URL Address Path
              </Label>
              <Input
                id="resource-add-url"
                placeholder="e.g. https://www.who.int/..."
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setIsResourceAddOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAddResource} disabled={updateSettings.isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
              {updateSettings.isPending ? "Adding..." : "Add Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={isResourceEditOpen} onOpenChange={setIsResourceEditOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-indigo-500" />
              Edit External Resource Link
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Modify the display label or the hyperlink URL path pointing to this external reference resource.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="resource-edit-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resource Name
              </Label>
              <Input
                id="resource-edit-name"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="resource-edit-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                URL Address Path
              </Label>
              <Input
                id="resource-edit-url"
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => { setIsResourceEditOpen(false); setEditingResourceIndex(null); }} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleEditResource} disabled={updateSettings.isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Add Video Dialog */}
      <Dialog open={isVideoAddOpen} onOpenChange={setIsVideoAddOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Video className="h-5 w-5 text-indigo-500" />
              Add Video Tutorial
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Configure a new instructional video walkthrough.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="video-add-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Video Title
              </Label>
              <Input
                id="video-add-title"
                placeholder="e.g. System Walkthrough Overview"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="video-add-duration" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Duration (MM:SS)
              </Label>
              <Input
                id="video-add-duration"
                placeholder="e.g. 05:30"
                value={videoDuration}
                onChange={(e) => setVideoDuration(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="video-add-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Upload / Video Link URL
              </Label>
              <SimulatedUpload
                initialUrl={videoUrl}
                onUploadComplete={(url) => setVideoUrl(url)}
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setIsVideoAddOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAddVideo} disabled={updateSettings.isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
              {updateSettings.isPending ? "Adding..." : "Add Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Edit Video Dialog */}
      <Dialog open={isVideoEditOpen} onOpenChange={setIsVideoEditOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border border-border text-foreground rounded-3xl shadow-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Video className="h-5 w-5 text-indigo-500" />
              Edit Video Tutorial
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Modify video title, duration or file asset URL.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="video-edit-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Video Title
              </Label>
              <Input
                id="video-edit-title"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="video-edit-duration" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Duration (MM:SS)
              </Label>
              <Input
                id="video-edit-duration"
                value={videoDuration}
                onChange={(e) => setVideoDuration(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="video-edit-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Upload / Video Link URL
              </Label>
              <SimulatedUpload
                initialUrl={videoUrl}
                onUploadComplete={(url) => setVideoUrl(url)}
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => { setIsVideoEditOpen(false); setEditingVideoIndex(null); }} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleEditVideo} disabled={updateSettings.isPending} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
