'use client';

import { RosterView } from '@/components/roster/RosterView';

export default function RosterPage() {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-text-1 md:text-2xl">Clan Roster</h2>
        <p className="text-sm text-text-2">Search, sort, and manage every member. Click a row for full details.</p>
      </header>
      <RosterView />
    </div>
  );
}
