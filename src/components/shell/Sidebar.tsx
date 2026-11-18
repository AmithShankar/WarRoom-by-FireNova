"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Download,
  Flame,
  History,
  LayoutDashboard,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHasMounted } from "@/hooks/useMediaQuery";

export const SIDEBAR_NAV = [
  { href: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/roster", label: "Clan Roster", short: "Roster", icon: Users },
  { href: "/cwl", label: "CWL Planner", short: "CWL", icon: Swords },
  { href: "/performance", label: "Performance", short: "Stats", icon: Trophy },
  {
    href: "/warnings",
    label: "Warnings",
    short: "Warnings",
    icon: AlertTriangle,
  },
] as const;

const NavLink = memo(function NavLink({
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
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-surface-3 text-text-1"
          : "text-text-2 hover:bg-surface-2 hover:text-text-1",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-linear-to-b from-brand-from to-brand-to"
        />
      )}
      <Icon
        className={cn(
          "h-4 w-4 transition-colors",
          active ? "text-brand-from" : "text-text-3 group-hover:text-brand-to",
        )}
      />
      {label}
    </Link>
  );
});

function SidebarInstallLink({ active }: { active: boolean }) {
  const mounted = useHasMounted();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const check =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(check);
    const onInstalled = () => setIsStandalone(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  if (!mounted || isStandalone) return null;

  return (
    <div className="px-3 pb-2">
      <Link
        href="/install"
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-surface-3 text-text-1"
            : "text-text-2 hover:bg-surface-2 hover:text-text-1",
        )}
      >
        <Download
          className={cn(
            "h-4 w-4 transition-colors",
            active ? "text-brand-from" : "text-text-3 group-hover:text-brand-to",
          )}
        />
        Install App
      </Link>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-30 hidden h-screen w-60 shrink-0 flex-col border-r border-border-1 bg-surface-1/80 backdrop-blur md:flex">
      <div className="flex items-center gap-2.5 border-b border-border-1 px-5 py-5">
        <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-brand-from to-brand-to shadow-glow-sm">
          <Flame className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-text-1">
            WarRoom
          </div>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-text-3">
            by FireNova
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {SIDEBAR_NAV.map(({ href, label, icon }) => (
          <NavLink
            key={href}
            href={href}
            label={label}
            Icon={icon}
            active={
              pathname === href || (href !== "/" && pathname.startsWith(href))
            }
          />
        ))}
        <div className="pt-2">
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-3">
            System
          </div>
          <NavLink
            href="/activity"
            label="Audit & Activity"
            Icon={History}
            active={pathname.startsWith("/activity")}
          />
        </div>
      </nav>

      <SidebarInstallLink active={pathname === "/install"} />

      <div className="border-t border-border-1 p-4 text-[10px] uppercase tracking-widest text-text-3">
        <div className="font-mono">FN-WARROOM v1.0</div>
        <div className="mt-1 normal-case tracking-normal text-text-2">
          Control the war.
        </div>
      </div>
    </aside>
  );
}
