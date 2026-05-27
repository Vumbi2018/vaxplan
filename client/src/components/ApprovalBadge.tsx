import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Lock, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";

type ApprovalStatus = "draft" | "pending" | "approved" | "rejected" | "locked";

interface ApprovalBadgeProps {
  status: ApprovalStatus;
  className?: string;
}

const statusConfig: Record<ApprovalStatus, {
  label: string;
  icon: typeof Clock;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
}> = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    variant: "secondary",
    className: "bg-muted text-muted-foreground",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    variant: "outline",
    className: "border-yellow-500 text-yellow-600 dark:text-yellow-400",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    variant: "outline",
    className: "border-green-500 text-green-600 dark:text-green-400",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    variant: "destructive",
    className: "",
  },
  locked: {
    label: "Locked",
    icon: Lock,
    variant: "secondary",
    className: "bg-muted text-muted-foreground",
  },
};

export function ApprovalBadge({ status, className }: ApprovalBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn("gap-1", config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
