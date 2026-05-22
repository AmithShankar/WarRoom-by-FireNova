'use client';

import { useState, useCallback, useMemo } from 'react';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import type { Player } from '@/lib/types';
import { useRosterData } from '@/hooks/useRosterData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RosterTable } from './RosterTable';
import { RosterCardList } from './RosterCardList';
import { RosterFilterBar } from './RosterFilterBar';
import { RosterSkeleton } from '@/components/skeletons/PageSkeletons';
import { QueryError } from '@/components/ui/QueryError';
import { applyRosterFilters, EMPTY_FILTERS, type RosterFilters } from '@/lib/roster-filters';
import { HistoricalMembersTable } from './HistoricalMembersTable';
import { PlayerDetailsSheet } from './PlayerDetailsSheet';
import { WarningSheet } from './WarningSheet';
import { KickSheet } from './KickSheet';

export function RosterView() {
  const isDesktop = useIsDesktop();
  const { data, isLoading, isError, refetch, issueWarning, kickPlayer, importPlayers, setChallenge, reclassifyDeparture } =
    useRosterData();

  const activePlayers = useMemo(
    () => data.filter(p => p.status !== 'Kicked' && p.status !== 'Left'),
    [data],
  );
  const historicalPlayers = useMemo(
    () => data.filter(p => p.status === 'Kicked' || p.status === 'Left'),
    [data],
  );

  const [filters, setFilters] = useState<RosterFilters>({
    ...EMPTY_FILTERS,
    challenge: ['Not Posted'],
  });
  const filteredActive = useMemo(
    () => applyRosterFilters(activePlayers, filters),
    [activePlayers, filters],
  );

  // Details sheet state
  const [detailsPlayer, setDetailsPlayer] = useState<Player | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Warning sheet state
  const [warnPlayer, setWarnPlayer] = useState<Player | null>(null);
  const [warnOpen, setWarnOpen] = useState(false);

  // Kick sheet state
  const [kickTarget, setKickTarget] = useState<Player | null>(null);
  const [kickOpen, setKickOpen] = useState(false);

  const openDetails = useCallback((p: Player) => {
    setDetailsPlayer(p);
    setDetailsOpen(true);
  }, []);

  const openWarn = useCallback((p: Player) => {
    setWarnPlayer(p);
    setWarnOpen(true);
  }, []);

  const openKick = useCallback((p: Player) => {
    setKickTarget(p);
    setKickOpen(true);
  }, []);

  const handleSetChallenge = useCallback(
    (p: Player) => setChallenge(p.playerTag, !p.postedChallenge),
    [setChallenge],
  );

  // Keep the details sheet in sync when the underlying data mutates.
  const currentDetailsPlayer = detailsPlayer
    ? data.find(p => p.playerTag === detailsPlayer.playerTag) ?? detailsPlayer
    : null;

  if (isError) return <QueryError message="Couldn't load the roster. Check your connection and try again." onRetry={refetch} />;
  if (isLoading) return <RosterSkeleton />;

  return (
    <>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Roster · {activePlayers.length}</TabsTrigger>
          <TabsTrigger value="historical">
            Historical Members · {historicalPlayers.length}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="mb-3">
            <RosterFilterBar
              players={activePlayers}
              filters={filters}
              onChange={setFilters}
              shownCount={filteredActive.length}
              totalCount={activePlayers.length}
            />
          </div>
          {isDesktop ? (
            <RosterTable
              data={filteredActive}
              onRowClick={openDetails}
              onWarnDirect={openWarn}
              onKick={openKick}
              onSetChallenge={handleSetChallenge}
              onImport={importPlayers}
            />
          ) : (
            <RosterCardList
              data={filteredActive}
              onRowClick={openDetails}
              onWarnDirect={openWarn}
              onKick={openKick}
              onSetChallenge={handleSetChallenge}
            />
          )}
        </TabsContent>

        <TabsContent value="historical">
          <HistoricalMembersTable
            data={historicalPlayers}
            onRowClick={openDetails}
            onReclassify={reclassifyDeparture}
          />
        </TabsContent>
      </Tabs>

      <PlayerDetailsSheet
        key={currentDetailsPlayer?.playerTag ?? 'details-none'}
        player={currentDetailsPlayer}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onIssueWarning={issueWarning}
      />

      <WarningSheet
        key={warnPlayer?.playerTag ? `warn-${warnPlayer.playerTag}` : 'warn-none'}
        player={warnPlayer}
        open={warnOpen}
        onOpenChange={setWarnOpen}
        onWarn={issueWarning}
      />

      <KickSheet
        key={kickTarget?.playerTag ? `kick-${kickTarget.playerTag}` : 'kick-none'}
        player={kickTarget}
        open={kickOpen}
        onOpenChange={setKickOpen}
        onKick={kickPlayer}
      />
    </>
  );
}
