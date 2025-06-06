"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings, HelpCircle, Loader2 } from "lucide-react";

export function UserNav() {
  const { data: session, status } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  if (status === "loading") {
    return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  }
  if (!session?.user) return null;

  const user = session.user;
  const userDisplayName = user.name || user.email?.split('@')[0] || 'User';
  const userInitials = userDisplayName.split(" ").map((n) => n[0]).join("").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full group">
           <div className="relative flex items-center justify-center w-full h-full rounded-full bg-green-600 text-white overflow-hidden border-2 border-gray-700 group-hover:border-gray-600">
            <Avatar className="h-full w-full">
              {user.image && <AvatarImage src={user.image} alt={userDisplayName} />}
              <AvatarFallback className="bg-green-600 text-white">{userInitials}</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-black bg-green-500 border-2 border-gray-700"></span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-gray-800/95 backdrop-blur-lg border-gray-700 text-gray-200" align="end" forceMount>
        <div className="px-4 py-3 border-b border-gray-700">
          <p className="text-sm font-semibold text-gray-100">{userDisplayName}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
        <div className="p-2">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/dashboard/profile" className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-700/70 transition-colors">
                <User className="text-green-400 mb-1.5" size={20} />
                <span className="text-xs text-gray-300">Profil</span>
            </Link>
            <Link href="/dashboard/settings" className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-700/70 transition-colors">
                <Settings className="text-green-400 mb-1.5" size={20} />
                <span className="text-xs text-gray-300">Paramètres</span>
            </Link>
            <Link href="/dashboard/help" className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-700/70 transition-colors">
                <HelpCircle className="text-green-400 mb-1.5" size={20} />
                <span className="text-xs text-gray-300">Aide</span>
            </Link>
            <button onClick={handleLogout} className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-700/70 transition-colors text-left w-full">
                <LogOut className="text-green-400 mb-1.5" size={20} />
                <span className="text-xs text-gray-300">Déconnexion</span>
            </button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}