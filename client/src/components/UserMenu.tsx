import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings, KeyRound } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { useState } from "react";
import { useLocation } from "wouter";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

interface UserMenuProps {
  user: UserType;
}

export function UserMenu({ user }: UserMenuProps) {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [, setLocation] = useLocation();
  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((n) => n?.[0])
    .join("")
    .toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";

  const roleLabel = {
    facility_clerk: "Facility Clerk",
    facility_in_charge: "Facility In-Charge",
    district_manager: "District Manager",
    provincial_coordinator: "Provincial Coordinator",
    national_admin: "National Admin",
    gis_specialist: "GIS Specialist",
  }[user.role || "facility_clerk"];

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2" data-testid="button-user-menu">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profileImageUrl || undefined} style={{ objectFit: "cover" }} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-sm font-medium">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span>{displayName}</span>
            <span className="text-xs font-normal text-muted-foreground">{roleLabel}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => setLocation("/settings?tab=profile")}
          className="cursor-pointer"
          data-testid="menu-item-profile"
        >
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setLocation("/settings")}
          className="cursor-pointer"
          data-testid="menu-item-settings"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setChangePasswordOpen(true);
          }}
          data-testid="menu-item-change-password"
        >
          <KeyRound className="mr-2 h-4 w-4" />
          Change password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            window.location.href = "/api/logout";
          }}
          className="cursor-pointer"
          data-testid="menu-item-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </>
  );
}
