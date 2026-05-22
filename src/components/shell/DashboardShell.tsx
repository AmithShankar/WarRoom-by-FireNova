import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-backdrop flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-w-0 flex-1 px-4 py-5 pb-24 md:px-6 md:py-6 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
