// src/components/user-nav.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings, CreditCard, HelpCircle, Loader2 } from "lucide-react"; // Added more icons
import Link from "next/link";

export function UserNav() {
  const { data: session, status } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" }); // Redirect to home/login page after sign out
  };

  if (status === "loading") {
    return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  }

  if (status === "unauthenticated" || !session?.user) {
    // Optionally, show a Sign In button if user is somehow unauthenticated here
    // For this MVP, we assume if UserNav is rendered, user should be authenticated.
    // This case should ideally be handled by the layout redirect.
    return (
      <Link href="/">
        <Button variant="outline">Sign In</Button>
      </Link>
    );
  }

  const user = session.user;
  // Logic to get display name and initials, similar to your old dashboard
  let userDisplayName = "User";
  if ((user as any).firstName && (user as any).lastName) {
    userDisplayName = `${(user as any).firstName} ${(user as any).lastName}`;
  } else if ((user as any).firstName) {
    userDisplayName = (user as any).firstName;
  } else if (user.name && user.name !== user.email) {
    userDisplayName = user.name;
  } else if (user.email) {
    userDisplayName = user.email.split('@')[0];
  }

  const userInitials = userDisplayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            {user.image ? (
              <AvatarImage src={user.image} alt={userDisplayName} />
            ) : null}
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userDisplayName}</p>
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/dashboard/profile"> {/* Adjust link as needed */}
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
          </Link>
          <Link href="/dashboard/settings"> {/* Adjust link as needed */}
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </Link>
          {/* Add more relevant links if needed */}
          {/* <Link href="/dashboard/billing">
            <DropdownMenuItem>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
            </DropdownMenuItem>
          </Link> */}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}