"use client";

import { usePathname } from "next/navigation";
import { Flame } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { SyncButton } from "./SyncButton";
import { WarStatusChip } from "./WarStatusChip";
import { InstallAppButton } from "./InstallAppButton";
import { SIDEBAR_NAV } from "./Sidebar";

export function TopBar() {
  const pathname = usePathname();
  const pageName =
    SIDEBAR_NAV.find((n) => n.href === pathname)?.label ??
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
        <SyncButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
