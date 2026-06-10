import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

// Small header indicator showing how many people are online in the current
// tenant right now. Polls a lightweight, PII-free count endpoint.
export function OnlinePresence() {
  const { data, isLoading } = useQuery<{ count: number }>({
    queryKey: ["/api/presence/online-count"],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  if (isLoading) return null;

  const count = data?.count ?? 0;
  const label = `${count} ${count === 1 ? "person" : "people"} online now`;

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
      title={label}
      aria-label={label}
      data-testid="online-presence"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <Users className="h-3.5 w-3.5" />
      <span className="font-medium tabular-nums text-foreground" data-testid="online-count">{count}</span>
      <span className="hidden lg:inline">online</span>
    </div>
  );
}
