'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download } from 'lucide-react';
import { useHasMounted } from '@/hooks/useMediaQuery';

export function InstallAppButton() {
  const mounted = useHasMounted();
  const pathname = usePathname();
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

  // Don't show the button if already running as an installed PWA,
  // before hydration has finished, or if already on the /install page itself.
  if (!mounted || isStandalone || pathname === '/install') {
    return null;
  }

  return (
    <Link
      href="/install"
      title="Install WarRoom app"
      aria-label="Install WarRoom app"
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-1 bg-surface-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-from/40"
    >
      <Download className="h-4 w-4" />
    </Link>
  );
}
