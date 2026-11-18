import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { FanContentNotice } from './FanContentNotice';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-backdrop flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex min-w-0 flex-1 flex-col px-4 py-5 pb-24 md:px-6 md:py-6 md:pb-6">
          <div className="flex-1">{children}</div>
          <FanContentNotice className="mt-8" />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
