import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, Mail, User as UserIcon } from "lucide-react";
import type { SignupRequest } from "@shared/schema";
import { format } from "date-fns";

type Status = "pending" | "approved" | "rejected";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    pending: { label: "Pending", cls: "bg-amber-500/10 text-amber-600", icon: Clock },
    approved: { label: "Approved", cls: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle },
    rejected: { label: "Rejected", cls: "bg-red-500/10 text-red-600", icon: XCircle },
    expired: { label: "Expired", cls: "bg-muted text-muted-foreground", icon: Clock },
  };
  const meta = map[status] ?? map.pending;
  const Icon = meta.icon;
  return (
    <Badge variant="secondary" className={meta.cls} data-testid={`badge-status-${status}`}>
      <Icon className="h-3 w-3 mr-1" />
      {meta.label}
    </Badge>
  );
}

export default function SignupRequests() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>("pending");
  const [active, setActive] = useState<SignupRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [reason, setReason] = useState("");

  /*
  // Original query (commented out to preserve working code while adding offline capabilities):
  const { data: rows, isLoading } = useQuery<SignupRequest[]>({
    queryKey: ["/api/signup-requests", status],
    queryFn: async () => {
      const r = await fetch(`/api/signup-requests?status=${status}`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });
  */

  // Updated query with offline resilient fallback:
  const { data: rows, isLoading } = useQuery<SignupRequest[]>({
    queryKey: ["/api/signup-requests", status],
    queryFn: async () => {
      if (!navigator.onLine) {
        return [];
      }
      const r = await fetch(`/api/signup-requests?status=${status}`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const decide = useMutation({
    mutationFn: async (vars: { id: string; decision: "approved" | "rejected"; reason: string }) =>
      apiRequest("PATCH", `/api/signup-requests/${vars.id}`, {
        decision: vars.decision,
        reason: vars.reason || undefined,
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/signup-requests"] });
      setActive(null);
      setDecision(null);
      setReason("");
      toast({
        title: vars.decision === "approved" ? "Request approved" : "Request rejected",
        description:
          vars.decision === "approved"
            ? "The user can now sign in with their email."
            : "The request was rejected.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Access Requests</h1>
        <p className="text-sm text-muted-foreground">
          Review self-service signup requests for your tenant.
        </p>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={status} className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !rows || rows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-empty">
                No {status} requests.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {rows.map((r) => (
                <Card key={r.id} data-testid={`card-signup-${r.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span data-testid={`text-name-${r.id}`}>{r.fullName}</span>
                        </CardTitle>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          <span data-testid={`text-email-${r.id}`}>{r.email}</span>
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      Requested role:{" "}
                      <span className="font-medium" data-testid={`text-role-${r.id}`}>
                        {r.requestedRole.replace(/_/g, " ")}
                      </span>
                    </div>
                    {r.justification && (
                      <div className="text-sm text-muted-foreground border-l-2 pl-3">
                        {r.justification}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Submitted {r.createdAt ? format(new Date(r.createdAt), "PPp") : ""}
                      {r.decidedAt && (
                        <>
                          {" · "}
                          Decided {format(new Date(r.decidedAt), "PPp")}
                          {r.decisionReason ? ` — "${r.decisionReason}"` : ""}
                        </>
                      )}
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => { setActive(r); setDecision("approved"); }}
                          data-testid={`button-approve-${r.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setActive(r); setDecision("rejected"); }}
                          data-testid={`button-reject-${r.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!active && !!decision}
        onOpenChange={(open) => {
          if (!open) { setActive(null); setDecision(null); setReason(""); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {decision === "approved" ? "Approve" : "Reject"} access request
            </DialogTitle>
            <DialogDescription>
              {active?.fullName} ({active?.email}) — {active?.requestedRole.replace(/_/g, " ")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={decision === "approved" ? "Optional note" : "Reason for rejection (optional)"}
            data-testid="input-reason"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setActive(null); setDecision(null); setReason(""); }}
              data-testid="button-cancel-decision"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                active && decision &&
                decide.mutate({ id: active.id, decision, reason })
              }
              disabled={decide.isPending}
              data-testid="button-confirm-decision"
            >
              {decide.isPending ? "Saving…" : `Confirm ${decision === "approved" ? "approve" : "reject"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
