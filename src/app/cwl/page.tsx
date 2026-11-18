'use client';

import { useCanEdit } from '@/hooks/useCanEdit';
import { CWLWarPlanner } from '@/components/cwl/CWLWarPlanner';

export default function CWLPage() {
  const canEdit = useCanEdit();
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-text-1 md:text-2xl">CWL War Planner</h2>
        <p className="text-sm text-text-2">
          {canEdit
            ? <>Build your 15-player lineup. Drag, drop, or multi-select players across the lineup, available pool, and the &ldquo;Will NOT play&rdquo; list.</>
            : 'The lineup for the current CWL season.'}
        </p>
      </header>
      <CWLWarPlanner />
    </div>
  );
}
