'use client';

import { CWLWarPlanner } from '@/components/cwl/CWLWarPlanner';

export default function CWLPage() {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-text-1 md:text-2xl">CWL War Planner</h2>
        <p className="text-sm text-text-2">Build your 15-player lineup. Drag, drop, or multi-select players across the lineup, available pool, and the &ldquo;Will NOT play&rdquo; list.</p>
      </header>
      <CWLWarPlanner />
    </div>
  );
}
