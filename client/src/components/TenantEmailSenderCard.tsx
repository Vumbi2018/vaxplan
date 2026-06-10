import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmailSenderSettings {
  fromAddress: string;
  fromName: string;
  replyTo: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function TenantEmailSenderCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<EmailSenderSettings>({
    queryKey: ["/api/me/tenant/email-sender"],
    retry: false,
  });

  const [fromAddress, setFromAddress] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");

  useEffect(() => {
    if (data) {
      setFromAddress(data.fromAddress || "");
      setFromName(data.fromName || "");
      setReplyTo(data.replyTo || "");
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (payload: EmailSenderSettings) =>
      apiRequest("PATCH", "/api/me/tenant/email-sender", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/tenant/email-sender"] });
      toast({
        title: "Email sender saved",
        description: "Outgoing notifications will now use this address.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to save email sender",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const fromAddressInvalid = fromAddress.trim() !== "" && !EMAIL_RE.test(fromAddress.trim());
  const replyToInvalid = replyTo.trim() !== "" && !EMAIL_RE.test(replyTo.trim());
  const canSave = !fromAddressInvalid && !replyToInvalid && !mutation.isPending;

  const onSave = () => {
    if (!canSave) return;
    mutation.mutate({
      fromAddress: fromAddress.trim(),
      fromName: fromName.trim(),
      replyTo: replyTo.trim(),
    });
  };

  return (
    <Card data-testid="card-tenant-email-sender">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Email Sender</CardTitle>
            <CardDescription>
              The "from" address used for notifications sent by this tenant
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-from-address" className="text-xs font-semibold">
            From address
          </Label>
          <Input
            id="email-from-address"
            type="email"
            placeholder="no-reply@health.gov.example"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            disabled={isLoading || mutation.isPending}
            aria-invalid={fromAddressInvalid}
            data-testid="input-email-from-address"
          />
          {fromAddressInvalid && (
            <p className="text-xs text-destructive">Must be a valid email address.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-from-name" className="text-xs font-semibold">
            From name
          </Label>
          <Input
            id="email-from-name"
            type="text"
            placeholder="VaxPlan Notifications"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            disabled={isLoading || mutation.isPending}
            maxLength={120}
            data-testid="input-email-from-name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-reply-to" className="text-xs font-semibold">
            Reply-to (optional)
          </Label>
          <Input
            id="email-reply-to"
            type="email"
            placeholder="support@health.gov.example"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            disabled={isLoading || mutation.isPending}
            aria-invalid={replyToInvalid}
            data-testid="input-email-reply-to"
          />
          {replyToInvalid && (
            <p className="text-xs text-destructive">Must be a valid email address.</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-normal">
          To deliver reliably, your domain still needs SPF and DKIM records that
          authorize VaxPlan's email provider. See the operator guide at{" "}
          <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-muted">
            docs/email-setup.md
          </code>{" "}
          in the VaxPlan repository for the DNS setup steps. Leaving a field
          blank falls back to the platform default sender.
        </p>

        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={!canSave}
            data-testid="button-save-email-sender"
          >
            {mutation.isPending ? "Saving..." : "Save Email Sender"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
