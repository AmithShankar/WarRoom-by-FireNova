import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { TrpcProvider } from '@/components/providers/TrpcProvider';
import { DashboardShell } from '@/components/shell/DashboardShell';
import { ServiceWorkerRegister } from '@/components/shell/ServiceWorkerRegister';
import { Toaster } from 'sonner';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WarRoom by FireNova',
  description: 'Control the Roster. Control the War.',
  applicationName: 'WarRoom by FireNova',
  appleWebApp: {
    capable: true,
    title: 'WarRoom',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#09090b' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-surface-1 text-text-1 antialiased" suppressHydrationWarning>
        <TrpcProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            storageKey="warroom-theme"
            disableTransitionOnChange
          >
            <DashboardShell>{children}</DashboardShell>
          </ThemeProvider>
        </TrpcProvider>
        <Toaster richColors position="bottom-right" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
