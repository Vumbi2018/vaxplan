import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, KeyRound } from "lucide-react";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MIN_LEN = 8;

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShow(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      // Password changes must NEVER be queued offline — a direct fetch with no
      // outbox fallback ensures the plaintext password is never persisted
      // locally and we only report success on a confirmed server response.
      if (!navigator.onLine) {
        throw new Error("You must be online to change your password.");
      }
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        let msg = "Could not change password.";
        try {
          const body = await res.json();
          if (body?.message) msg = body.message;
        } catch {
          /* non-JSON error */
        }
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been changed. Use it next time you sign in.",
      });
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Could not change password",
        description: String(err?.message || "").replace(/^\d+:\s*/, "") || "Please try again.",
      });
    },
  });

  const handleSubmit = () => {
    if (newPassword.length < MIN_LEN) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: `Your new password must be at least ${MIN_LEN} characters.`,
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords do not match",
        description: "The new password and confirmation must be identical.",
      });
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change your password
          </DialogTitle>
          <DialogDescription>
            Choose a new password for signing in with your email. It must be at least {MIN_LEN} characters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cp-current">Current password</Label>
            <Input
              id="cp-current"
              type={show ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Leave blank if you have not set one yet"
              data-testid="input-current-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-new">New password</Label>
            <div className="relative">
              <Input
                id="cp-new"
                type={show ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                data-testid="input-new-password"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide passwords" : "Show passwords"}
                data-testid="button-toggle-password-visibility"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">Confirm new password</Label>
            <Input
              id="cp-confirm"
              type={show ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              data-testid="input-confirm-password"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-change-password">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending} data-testid="button-submit-change-password">
            {mutation.isPending ? "Saving..." : "Update password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
