'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ClipboardList,
  Filter,
  History,
  LogIn,
  LogOut,
  Search,
  ShieldCheck,
  Star,
  Swords,
  Users,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Row, parseActivitySummary } from '@/components/dashboard/ActivityFeed';
import { trpc } from '@/lib/trpc';
import { TableSkeleton } from '@/components/skeletons/PageSkeletons';
import { QueryError } from '@/components/ui/QueryError';
import { mapClanActivity } from '@/hooks/mappers';
import { cn } from '@/lib/utils';
import type { ClanActivity } from '@/lib/types';

function isAuditEntry(a: ClanActivity): boolean {
  const { editor } = parseActivitySummary(a.summary);
  if (editor) return true;
  if (a.type === 'warning' || a.type === 'kick') return true;
  const s = a.summary.toLowerCase();
  return (
    s.includes('cwl') ||
    s.includes('lineup') ||
    s.includes('challenge') ||
    s.includes('marked staying') ||
    s.includes('reclassified') ||
    s.includes('imported')
  );
}

function ActivityContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'audit' ? 'audit' : 'all';
  const [tab, setTab] = useState<'all' | 'audit'>(initialTab);
  const [search, setSearch] = useState('');
  const [auditFilter, setAuditFilter] = useState<'all' | 'warning' | 'kick' | 'cwl' | 'promotion'>('all');

  const me = trpc.auth.me.useQuery();
  const isLeader = !!me.data?.editor;

  const query = trpc.dashboard.allActivity.useQuery();
  const activity = useMemo<ClanActivity[]>(
    () => (query.data ?? []).map(mapClanActivity),
    [query.data],
  );

  const auditEntries = useMemo(
    () => activity.filter(isAuditEntry),
    [activity],
  );

  const entriesWithEditor = useMemo(
    () => auditEntries.filter(a => parseActivitySummary(a.summary).editor !== null),
    [auditEntries],
  );

  const filteredEntries = useMemo(() => {
    const list = tab === 'audit' ? auditEntries : activity;
    const q = search.trim().toLowerCase();

    return list.filter(item => {
      if (tab === 'audit' && auditFilter !== 'all') {
        if (auditFilter === 'warning' && item.type !== 'warning') return false;
        if (auditFilter === 'kick' && item.type !== 'kick') return false;
        if (auditFilter === 'cwl' && item.type !== 'cwl') return false;
        if (auditFilter === 'promotion' && item.type !== 'promotion') return false;
      }
      if (!q) return true;
      const { text, editor } = parseActivitySummary(item.summary);
      return (
        text.toLowerCase().includes(q) ||
        (editor && editor.toLowerCase().includes(q)) ||
        (item.player && item.player.toLowerCase().includes(q))
      );
    });
  }, [tab, auditEntries, activity, search, auditFilter]);

  if (query.isError) {
    return (
      <QueryError
        message="Couldn't load activity. Check your connection and try again."
        onRetry={() => query.refetch()}
      />
    );
  }

  if (query.isLoading) {
    return <TableSkeleton rows={10} />;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-1 md:text-2xl">
            Activity & Audit Log
          </h2>
          <p className="text-sm text-text-2">
            Track clan events, war outcomes, and changes made by Leaders & Co-Leaders.
          </p>
        </div>
      </header>

      {/* Overview Cards for Audit Log */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-3.5 sm:p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-text-3">
            <ClipboardList className="h-4 w-4 text-brand-from" />
            <span>Leader Actions</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-text-1">
            {auditEntries.length}
          </div>
          <p className="mt-0.5 text-[11px] text-text-3">Modifications & warnings</p>
        </Card>

        {isLeader ? (
          <Card className="p-3.5 sm:p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-text-3">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Signed-in Changes</span>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-400">
              {entriesWithEditor.length}
            </div>
            <p className="mt-0.5 text-[11px] text-text-3">With editor attribution</p>
          </Card>
        ) : (
          <Card className="p-3.5 sm:p-4 border-border-1 bg-surface-2/40">
            <div className="flex items-center gap-2 text-xs font-medium text-text-3">
              <ShieldCheck className="h-4 w-4 text-text-3" />
              <span>Editor Attribution</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-text-2">
              Leader Only
            </div>
            <p className="mt-0.5 text-[11px] text-text-3">Hidden in viewer mode</p>
          </Card>
        )}

        <Card className="col-span-2 p-3.5 sm:col-span-1 sm:p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-text-3">
            <History className="h-4 w-4 text-sky-400" />
            <span>Total Clan Events</span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-text-1">
            {activity.length}
          </div>
          <p className="mt-0.5 text-[11px] text-text-3">Wars, joins, promotions</p>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as 'all' | 'audit')} className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="all" className="gap-2">
              <History className="h-3.5 w-3.5" />
              <span>All Activity</span>
              <span className="ml-1 rounded-full bg-surface-3 px-1.5 py-0.2 text-[10px] text-text-2">
                {activity.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-from" />
              <span>Audit Log</span>
              <span className="ml-1 rounded-full bg-brand-from/20 px-1.5 py-0.2 text-[10px] font-semibold text-brand-from">
                {auditEntries.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by player, editor, action..."
              className="pl-8 text-xs"
            />
          </div>
        </div>

        {tab === 'audit' && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-text-3">Action type:</span>
            {(
              [
                { id: 'all', label: 'All Actions' },
                { id: 'warning', label: 'Warnings' },
                { id: 'kick', label: 'Kicks & Departures' },
                { id: 'cwl', label: 'CWL Lineup' },
                { id: 'promotion', label: 'Status & Challenges' },
              ] as const
            ).map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setAuditFilter(f.id)}
                className={cn(
                  'cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  auditFilter === f.id
                    ? 'bg-brand-from text-white'
                    : 'bg-surface-2 text-text-2 hover:bg-surface-3 hover:text-text-1',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        <TabsContent value="all" className="mt-4">
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border-1">
              {filteredEntries.map(a => (
                <Row key={a.id} entry={a} showEditor={isLeader} />
              ))}
              {filteredEntries.length === 0 && (
                <li className="px-5 py-12 text-center text-sm text-text-3">
                  {search ? 'No activity matches your search.' : 'No activity recorded.'}
                </li>
              )}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border-1 bg-surface-2/40 px-5 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Leader Modification History</CardTitle>
                  <CardDescription className="text-xs">
                    {isLeader
                      ? 'Every warning, removal, roster update, and CWL adjustment with the editor who made it.'
                      : 'Every warning, removal, roster update, and CWL adjustment. (Editor names hidden in viewer mode).'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <ul className="divide-y divide-border-1">
              {filteredEntries.map(a => (
                <Row key={a.id} entry={a} showEditor={isLeader} />
              ))}
              {filteredEntries.length === 0 && (
                <li className="px-5 py-12 text-center text-sm text-text-3">
                  {search || auditFilter !== 'all'
                    ? 'No audit log entries match your filters.'
                    : 'No leader changes recorded yet. Actions taken by signed-in Leaders and Co-Leaders will appear here.'}
                </li>
              )}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={10} />}>
      <ActivityContent />
    </Suspense>
  );
}
