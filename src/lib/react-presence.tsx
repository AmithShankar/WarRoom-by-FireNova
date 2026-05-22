'use client';

/**
 * Drop-in replacement for @radix-ui/react-presence that eliminates the React
 * 19 infinite re-render loop.
 *
 * Root cause: the original usePresence stores the DOM node in useState and
 * returns a ref callback that calls setNode(). In React 19, ref callbacks fire
 * with null on every render cleanup (when the ref prop changes identity), which
 * triggers setNode(null) → re-render → ref cleanup → setNode(null) → ∞ loop.
 *
 * Fix: make the ref callback a true no-op. With forceMount, the element is
 * always in the DOM and CSS animations (data-[state=open/closed]) handle all
 * transitions - we never need to wait for an "animation end" event before
 * unmounting because the element never unmounts. The state machine still tracks
 * present/not-present to correctly return isPresent to Radix's Dialog/Popover.
 */

import * as React from 'react';

// ─── Inlined: @radix-ui/react-use-layout-effect (SSR-safe) ───────────────────
const useLayoutEffect =
  typeof document !== 'undefined' ? React.useLayoutEffect : React.useEffect;

// ─── Inlined: @radix-ui/react-compose-refs ───────────────────────────────────
type ReactRef<T> =
  | React.RefCallback<T>
  | React.MutableRefObject<T | null>
  | null
  | undefined;

function setRef<T>(ref: ReactRef<T>, value: T) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    (ref as React.MutableRefObject<T>).current = value;
  }
}

function composeRefs<T>(...refs: ReactRef<T>[]): React.RefCallback<T> {
  return (node: T) => {
    for (const ref of refs) setRef(ref, node);
  };
}

function useComposedRefs<T>(...refs: ReactRef<T>[]): React.RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(composeRefs(...refs), refs);
}

// ─── State machine ────────────────────────────────────────────────────────────
type MachineState = 'mounted' | 'unmountSuspended' | 'unmounted';
type MachineEvent = 'MOUNT' | 'UNMOUNT' | 'ANIMATION_OUT' | 'ANIMATION_END';

type Machine = {
  [S in MachineState]: Partial<Record<MachineEvent, MachineState>>;
};

function useStateMachine(initialState: MachineState, machine: Machine) {
  return React.useReducer(
    (state: MachineState, event: MachineEvent): MachineState =>
      machine[state][event] ?? state,
    initialState,
  );
}

// ─── usePresence ──────────────────────────────────────────────────────────────
function usePresence(present: boolean) {
  const prevPresentRef = React.useRef(present);
  const initialState: MachineState = present ? 'mounted' : 'unmounted';

  const [state, send] = useStateMachine(initialState, {
    mounted: {
      UNMOUNT: 'unmounted',
      ANIMATION_OUT: 'unmountSuspended',
    },
    unmountSuspended: {
      MOUNT: 'mounted',
      ANIMATION_END: 'unmounted',
    },
    unmounted: {
      MOUNT: 'mounted',
    },
  });

  useLayoutEffect(() => {
    const wasPresent = prevPresentRef.current;
    const hasPresentChanged = wasPresent !== present;
    if (hasPresentChanged) {
      // When forceMount is used the element never leaves the DOM, so exit
      // animations run as CSS and we don't need to wait for animationend.
      // Always use UNMOUNT (no ANIMATION_OUT) to avoid needing DOM node tracking.
      if (present) {
        send('MOUNT');
      } else {
        send('UNMOUNT');
      }
      prevPresentRef.current = present;
    }
  }, [present, send]);

  return {
    isPresent: (['mounted', 'unmountSuspended'] as MachineState[]).includes(state),
    // True no-op ref: zero state touched → zero re-renders from ref callbacks.
    // React 19 fires this with null on cleanup; with state, that would cause
    // a re-render loop. With a no-op, nothing happens. The DOM node is not
    // needed because animation-end-driven unmounting is handled above by CSS.
    ref: React.useCallback((_node: HTMLElement | null) => {
      // intentionally empty
    }, []),
  };
}

// ─── getElementRef helper ─────────────────────────────────────────────────────
function getElementRef(element: React.ReactElement) {
  const propsDesc = Object.getOwnPropertyDescriptor(element.props, 'ref');
  const propsGetter = propsDesc?.get;
  if (propsGetter && 'isReactWarning' in propsGetter && propsGetter.isReactWarning) {
    return (element as unknown as { ref: React.Ref<unknown> }).ref;
  }
  const elemDesc = Object.getOwnPropertyDescriptor(element, 'ref');
  const elemGetter = elemDesc?.get;
  if (elemGetter && 'isReactWarning' in elemGetter && elemGetter.isReactWarning) {
    return (element.props as { ref?: React.Ref<unknown> }).ref;
  }
  return (
    (element.props as { ref?: React.Ref<unknown> }).ref ??
    (element as unknown as { ref?: React.Ref<unknown> }).ref
  );
}

// ─── Presence component ───────────────────────────────────────────────────────
interface PresenceProps {
  present: boolean;
  children:
    | React.ReactElement
    | ((props: { present: boolean }) => React.ReactElement);
}

export const Presence: React.FC<PresenceProps> = ({ present, children }) => {
  const presence = usePresence(present);
  const child =
    typeof children === 'function'
      ? children({ present: presence.isPresent })
      : React.Children.only(children);

  // presence.ref is a no-op (empty deps, stable identity).
  // We still compose it with the child's existing ref so Radix's internal
  // forwarded refs (e.g. Dialog's contentRef) receive the element correctly.
  const childRef = getElementRef(child as React.ReactElement) as ReactRef<unknown>;
  const ref = useComposedRefs(
    presence.ref as ReactRef<unknown>,
    childRef,
  ) as React.RefCallback<unknown>;

  const forceMount = typeof children === 'function';
  return forceMount || presence.isPresent
    ? React.cloneElement(child as React.ReactElement<{ ref?: React.Ref<unknown> }>, { ref })
    : null;
};
Presence.displayName = 'Presence';

export const Root = Presence;
