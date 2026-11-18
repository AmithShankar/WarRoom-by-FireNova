"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ThemeToggle } from "./ThemeToggle";
import { SyncButton } from "./SyncButton";
import { WarStatusChip } from "./WarStatusChip";
import { InstallAppButton } from "./InstallAppButton";
import { NotificationsButton } from './NotificationsButton';
import { SIDEBAR_NAV } from "./Sidebar";
import { SignInSheet } from "./SignInSheet";

function AccessControls() {
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();
  const [signInOpen, setSignInOpen] = useState(false);
  const signOut = trpc.auth.signOut.useMutation({
    onSettled: () => {
      utils.auth.me.invalidate();
      toast.info('Signed out. You are now in view-only mode.');
    },
  });

  if (me.data?.editor) {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <Link
          href="/activity?tab=audit"
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
          title={`Signed in as ${me.data.editor.name} — tap to open Audit Log`}
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span className="max-w-[70px] truncate sm:max-w-32">{me.data.editor.name}</span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
          title="Sign out"
          aria-label="Sign out"
          className="text-text-3 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Sign out</span>
        </Button>
      </div>
    );
  }

  if (!me.data?.lockOn) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden text-xs text-text-3 sm:inline">View only</span>
      <Button
        variant="subtle"
        size="sm"
        onClick={() => setSignInOpen(true)}
        title="Sign in"
        aria-label="Sign in"
        className="gap-1.5"
      >
        <LogIn className="h-4 w-4" />
        <span>Sign in</span>
      </Button>
      <SignInSheet open={signInOpen} onOpenChange={setSignInOpen} />
    </div>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const pageName =
    pathname === "/install"
      ? "Install App"
      : pathname.startsWith("/activity")
      ? "Activity & Audit"
      : SIDEBAR_NAV.find((n) => n.href === pathname)?.label ??
        SIDEBAR_NAV.find((n) => n.href !== "/" && pathname.startsWith(n.href))
          ?.label ??
        "WarRoom";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border-1 bg-surface-1/85 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2.5 md:hidden">
        <div className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-brand-from to-brand-to">
          <Flame className="h-4 w-4 text-white" />
        </div>
        <h1 className="truncate text-sm font-semibold tracking-tight text-text-1">
          {pageName}
        </h1>
      </div>

      <div className="hidden md:block">
        <h1 className="text-sm font-semibold tracking-tight text-text-1">
          {pageName}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <WarStatusChip />
        <InstallAppButton />
        <NotificationsButton />
        <SyncButton />
        <ThemeToggle />
        <AccessControls />
      </div>
    </header>
  );
}
