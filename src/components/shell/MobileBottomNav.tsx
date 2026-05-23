"use client";

import { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SIDEBAR_NAV } from "./Sidebar";

const TabLink = memo(function TabLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      replace
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors",
        active ? "text-text-1" : "text-text-3 active:text-text-1",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-12 items-center justify-center rounded-xl transition-all",
          active && "bg-linear-to-br from-brand-from/15 to-brand-to/15",
        )}
      >
        <Icon className={cn("h-5 w-5", active && "text-brand-from")} />
      </span>
      {label}
    </Link>
  );
});

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border-1 bg-surface-1/95 px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] backdrop-blur md:hidden"
      aria-label="Primary"
    >
      {SIDEBAR_NAV.map(({ href, short, icon }) => (
        <TabLink
          key={href}
          href={href}
          label={short}
          Icon={icon}
          active={
            pathname === href || (href !== "/" && pathname.startsWith(href))
          }
        />
      ))}
    </nav>
  );
}
