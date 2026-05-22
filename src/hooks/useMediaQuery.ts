'use client';

import { useCallback, useSyncExternalStore } from 'react';

// SSR-safe matchMedia. Uses useSyncExternalStore to avoid setState-in-effect,
// returns `false` during SSR and during the first client render before hydration.
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', notify);
      return () => mql.removeEventListener('change', notify);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');

// Returns true once the component has hydrated on the client.
// SSR-safe alternative to a useEffect+useState mount flag.
const _noop = () => () => {};
const _trueSnap = () => true;
const _falseSnap = () => false;
export function useHasMounted(): boolean {
  return useSyncExternalStore(_noop, _trueSnap, _falseSnap);
}

// React-pure "now" snapshot that is SAFE with React 19.
//
// CRITICAL: getSnapshot must return a STABLE cached value. Using () => Date.now()
// directly violates React's rule that getSnapshot() must return the same value
// between consecutive calls unless the store has changed. Date.now() changes every
// millisecond, so React 19's updateStoreInstance always sees a "changed" snapshot
// and calls forceStoreRerender infinitely.
//
// Fix: use a module-level cached value that is only updated by the interval tick.
let _now = Date.now();
const _nowSubscribers = new Set<() => void>();
let _nowTimer: ReturnType<typeof setInterval> | null = null;

function _subscribeToNow(notify: () => void): () => void {
  _nowSubscribers.add(notify);
  if (_nowTimer === null) {
    _nowTimer = setInterval(() => {
      _now = Date.now();
      _nowSubscribers.forEach((fn) => fn());
    }, 60_000);
  }
  return () => {
    _nowSubscribers.delete(notify);
    if (_nowSubscribers.size === 0 && _nowTimer !== null) {
      clearInterval(_nowTimer);
      _nowTimer = null;
    }
  };
}

function _getNow(): number {
  return _now;
}

function _getNowServer(): number {
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useNow(_intervalMs = 60_000): number {
  return useSyncExternalStore(_subscribeToNow, _getNow, _getNowServer);
}
