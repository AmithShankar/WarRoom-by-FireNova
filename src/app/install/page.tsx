'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Share,
  PlusSquare,
  MoreVertical,
  Monitor,
  Smartphone,
  Apple,
  ExternalLink,
  Sparkles,
  Bell,
  Zap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHasMounted } from '@/hooks/useMediaQuery';
import { toast } from 'sonner';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function InstallPage() {
  const mounted = useHasMounted();
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standaloneCheck);

    const ua = navigator.userAgent || '';
    const inAppCheck = /FBAN|FBAV|Instagram|Discord|Twitter|Snapchat|ByteDance|TikTok|Line|WhatsApp|MicroMessenger/i.test(ua);
    setIsInAppBrowser(inAppCheck);

    if (/iPhone|iPad|iPod/i.test(ua)) {
      setDetectedPlatform('ios');
    } else if (/Android/i.test(ua)) {
      setDetectedPlatform('android');
    } else {
      setDetectedPlatform('desktop');
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setIsStandalone(true);
      setInstallPrompt(null);
      toast.success('WarRoom was successfully installed!');
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleCopyLink = async () => {
    try {
      const url = window.location.origin;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } catch (e) {
      console.warn('Install prompt error:', e);
    }
  };

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-6">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-2" />
        <div className="h-32 w-full animate-pulse rounded-xl bg-surface-2" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12 pt-2">
      {/* Page Header */}
      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-text-1 md:text-2xl">
            Install WarRoom
          </h2>
          <Badge tone="brand">PWA</Badge>
        </div>
        <p className="text-sm text-text-2">
          Install WarRoom onto your home screen or desktop for instant access, full-screen view, and real-time push alerts.
        </p>
      </header>

      {/* State 1: Already Installed */}
      {isStandalone && (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardHeader className="flex flex-row items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-400" />
            <div className="space-y-1">
              <CardTitle className="text-emerald-700 dark:text-emerald-300">
                WarRoom is already installed!
              </CardTitle>
              <CardDescription className="text-emerald-800/80 dark:text-emerald-300/80">
                You are currently running WarRoom in standalone app mode. You have full offline caching and push notification capability enabled.
              </CardDescription>
              <div className="pt-2">
                <Button asChild size="sm" variant="default">
                  <Link href="/">Open Command Center</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* State 2: In-App Browser Warning (Discord, Instagram, WhatsApp, etc.) */}
      {!isStandalone && isInAppBrowser && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardHeader className="flex flex-row items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="space-y-1.5 flex-1">
              <CardTitle className="text-amber-800 dark:text-amber-300">
                In-App Browser Detected
              </CardTitle>
              <CardDescription className="text-amber-900/80 dark:text-amber-300/80">
                You opened WarRoom inside an app (like Discord, WhatsApp, or Instagram). In-app browsers block web app installation and push notifications.
              </CardDescription>
              <div className="rounded-lg bg-surface-1/60 p-3 text-xs text-text-1">
                <strong>How to fix:</strong> Tap the menu button (<MoreVertical className="inline h-3.5 w-3.5" /> or Share icon) in your screen corner and select <strong>&quot;Open in Chrome&quot;</strong> or <strong>&quot;Open in Safari&quot;</strong>.
              </div>
              <div className="pt-1 flex gap-2">
                <Button size="sm" variant="subtle" onClick={handleCopyLink} className="gap-1.5">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Website URL'}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* State 3: Native 1-Click Install Available (Chrome/Edge/Android) */}
      {!isStandalone && installPrompt && (
        <Card className="border-brand-from/40 bg-linear-to-r from-brand-from/10 via-surface-1 to-brand-to/10">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-from">
                <Sparkles className="h-3.5 w-3.5" /> 1-Click Install Ready
              </div>
              <CardTitle>Install directly to your device</CardTitle>
              <CardDescription>
                Your browser supports one-click installation. Click below to add WarRoom right to your apps.
              </CardDescription>
            </div>
            <Button
              size="default"
              variant="default"
              onClick={handleInstallClick}
              className="gap-2 shrink-0 shadow-md"
            >
              <Download className="h-4 w-4" />
              <span>Install WarRoom</span>
            </Button>
          </CardHeader>
        </Card>
      )}

      {/* Step-by-Step Instructions by Platform */}
      {!isStandalone && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-text-1">
              Step-by-Step Installation Guides
            </h3>
            <span className="text-xs text-text-3">
              Detected device: <strong className="capitalize text-text-2">{detectedPlatform}</strong>
            </span>
          </div>

          <Tabs defaultValue={detectedPlatform} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ios" className="gap-1.5 text-xs">
                <Apple className="h-3.5 w-3.5" />
                <span>iPhone / iPad</span>
              </TabsTrigger>
              <TabsTrigger value="android" className="gap-1.5 text-xs">
                <Smartphone className="h-3.5 w-3.5" />
                <span>Android</span>
              </TabsTrigger>
              <TabsTrigger value="desktop" className="gap-1.5 text-xs">
                <Monitor className="h-3.5 w-3.5" />
                <span>Desktop (PC / Mac)</span>
              </TabsTrigger>
            </TabsList>

            {/* iOS Tab */}
            <TabsContent value="ios" className="space-y-3 pt-1">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Apple iOS Safari Instructions</CardTitle>
                    <Badge tone="muted" className="text-[11px]">Recommended: Safari</Badge>
                  </div>
                  <CardDescription>
                    Apple requires using <strong>Safari</strong> to install web apps and activate push notifications.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5 pt-0">
                  <div className="flex items-start gap-3 rounded-lg border border-border-1 bg-surface-2/40 p-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-from text-xs font-semibold text-white">
                      1
                    </div>
                    <div className="text-xs leading-relaxed text-text-1">
                      Open this URL in the <strong>Safari</strong> browser (not Chrome or an in-app viewer).
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-border-1 bg-surface-2/40 p-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-from text-xs font-semibold text-white">
                      2
                    </div>
                    <div className="text-xs leading-relaxed text-text-1">
                      Tap the <strong>Share</strong> button <Share className="inline h-3.5 w-3.5 text-brand-from mx-0.5" /> in the bottom toolbar of Safari (or top toolbar on iPad).
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-border-1 bg-surface-2/40 p-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-from text-xs font-semibold text-white">
                      3
                    </div>
                    <div className="text-xs leading-relaxed text-text-1">
                      Scroll down the share sheet menu and tap <strong>&quot;Add to Home Screen&quot;</strong> <PlusSquare className="inline h-3.5 w-3.5 text-text-2 mx-0.5" />.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-border-1 bg-surface-2/40 p-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-from text-xs font-semibold text-white">
                      4
                    </div>
                    <div className="text-xs leading-relaxed text-text-1">
                      Tap <strong>&quot;Add&quot;</strong> in the top-right corner. The WarRoom app icon will now appear on your home screen!
                    </div>
                  </div>

                  <div className="rounded-lg border border-brand-from/20 bg-brand-from/5 p-3 text-[11px] text-text-2">
                    <strong className="text-text-1">Push Notifications on iOS:</strong> Open WarRoom from your new Home Screen icon, then tap the bell icon in the top bar to enable instant war and warning alerts.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Android Tab */}
            <TabsContent value="android" className="space-y-3 pt-1">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Android Instructions</CardTitle>
                    <Badge tone="muted" className="text-[11px]">Recommended: Chrome or Edge</Badge>
                  </div>
                  <CardDescription>
                    Install directly from Google Chrome or Microsoft Edge for a full app experience.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5 pt-0">
                  <div className="flex items-start gap-3 rounded-lg border border-border-1 bg-surface-2/40 p-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-from text-xs font-semibold text-white">
                      1
                    </div>
                    <div className="text-xs leading-relaxed text-text-1">
                      Open this URL in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-border-1 bg-surface-2/40 p-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-from text-xs font-semibold text-white">
                      2
                    </div>
                    <div className="text-xs leading-relaxed text-text-1">
                      Tap the <strong>three dots menu (`⋮`)</strong> in the top-right corner of Chrome.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-border-1 bg-surface-2/40 p-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-from text-xs font-semibold text-white">
                      3
                    </div>
                    <div className="text-xs leading-relaxed text-text-1">
                      Tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-border-1 bg-surface-2/40 p-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-from text-xs font-semibold text-white">
                      4
                    </div>
                    <div className="text-xs leading-relaxed text-text-1">
                      Confirm by tapping <strong>&quot;Install&quot;</strong>. WarRoom will install and run without browser address bars.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Desktop Tab */}
            <TabsContent value="desktop" className="space-y-3 pt-1">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Desktop (Windows / Mac / Linux)</CardTitle>
                    <Badge tone="muted" className="text-[11px]">Recommended: Chrome, Edge, Brave</Badge>
                  </div>
                  <CardDescription>
                    Run WarRoom as a dedicated desktop window without browser tabs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5 pt-0">
                  <div className="flex items-start gap-3 rounded-lg border border-border-1 bg-surface-2/40 p-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-from text-xs font-semibold text-white">
                      1
                    </div>
                    <div className="text-xs leading-relaxed text-text-1">
                      Open this URL in <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or <strong>Brave</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-border-1 bg-surface-2/40 p-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-from text-xs font-semibold text-white">
                      2
                    </div>
                    <div className="text-xs leading-relaxed text-text-1">
                      Look at the right side of the address bar at the top of your browser for the <strong>Install icon</strong> (<Download className="inline h-3.5 w-3.5 text-brand-from mx-0.5" /> or a small computer monitor symbol).
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-border-1 bg-surface-2/40 p-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-from text-xs font-semibold text-white">
                      3
                    </div>
                    <div className="text-xs leading-relaxed text-text-1">
                      Alternatively, click the browser menu (<strong>`⋮`</strong> or <strong>`…`</strong>) &rarr; <strong>&quot;Save and Share&quot;</strong> &rarr; <strong>&quot;Install WarRoom&quot;</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-border-1 bg-surface-2/40 p-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-from text-xs font-semibold text-white">
                      4
                    </div>
                    <div className="text-xs leading-relaxed text-text-1">
                      Click <strong>&quot;Install&quot;</strong>. WarRoom will open in its own clean window.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-xl border border-border-1 bg-surface-1 p-3.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-from/10 text-brand-from">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-text-1">Instant Launch</h4>
            <p className="mt-0.5 text-[11px] text-text-3">
              Cached app shell opens in milliseconds, even on spotty mobile data.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border-1 bg-surface-1 p-3.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-text-1">Push Notifications</h4>
            <p className="mt-0.5 text-[11px] text-text-3">
              Receive background notifications when warnings expire or clan sync alerts occur.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border-1 bg-surface-1 p-3.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-500">
            <ExternalLink className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-text-1">Native Feel</h4>
            <p className="mt-0.5 text-[11px] text-text-3">
              Full-screen layout without browser toolbars, keeping your focus on the war.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
