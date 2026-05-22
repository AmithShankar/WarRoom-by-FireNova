'use client';

/**
 * Drop-in replacement for @radix-ui/react-focus-scope that fixes the React 19
 * infinite loop. The original uses useState(null) + (node) => setContainer(node)
 * as a ref callback, which fires with null on every render cleanup in React 19,
 * causing setContainer(null) → re-render → cleanup → setContainer(null) → ∞ loop.
 *
 * Fix: skip setContainer when node is null.
 * asChild support is provided via @radix-ui/react-slot (a direct app dependency).
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

// ─── Inlined: @radix-ui/react-use-callback-ref ───────────────────────────────
function useCallbackRef<T extends (...args: never[]) => unknown>(
  callback: T | undefined,
): T {
  const callbackRef = React.useRef(callback);
  React.useEffect(() => {
    callbackRef.current = callback;
  });
  return React.useCallback(
    (...args: Parameters<T>) => callbackRef.current?.(...args),
    [],
  ) as T;
}

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

// ─── Constants ────────────────────────────────────────────────────────────────
const AUTOFOCUS_ON_MOUNT = 'focusScope.autoFocusOnMount';
const AUTOFOCUS_ON_UNMOUNT = 'focusScope.autoFocusOnUnmount';
const EVENT_OPTIONS = { bubbles: false, cancelable: true };

// ─── Focus utilities ──────────────────────────────────────────────────────────
function focusFirst(candidates: HTMLElement[], { select = false } = {}) {
  const previouslyFocusedElement = document.activeElement;
  for (const candidate of candidates) {
    focus(candidate, { select });
    if (document.activeElement !== previouslyFocusedElement) return;
  }
}

function getTabbableEdges(container: HTMLElement) {
  const candidates = getTabbableCandidates(container);
  const first = findVisible(candidates, container);
  const last = findVisible([...candidates].reverse(), container);
  return [first, last];
}

function getTabbableCandidates(container: HTMLElement) {
  const nodes: HTMLElement[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node: Element) => {
      const el = node as HTMLElement & { disabled?: boolean; hidden?: boolean };
      const isHiddenInput =
        el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'hidden';
      if (el.disabled || el.hidden || isHiddenInput) return NodeFilter.FILTER_SKIP;
      return el.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  while (walker.nextNode()) nodes.push(walker.currentNode as HTMLElement);
  return nodes;
}

function findVisible(
  elements: HTMLElement[],
  container: HTMLElement,
): HTMLElement | undefined {
  for (const element of elements) {
    if (!isHidden(element, { upTo: container })) return element;
  }
}

function isHidden(
  node: HTMLElement | null,
  { upTo }: { upTo?: HTMLElement },
): boolean {
  if (!node) return false;
  if (getComputedStyle(node).visibility === 'hidden') return true;
  let current: HTMLElement | null = node;
  while (current) {
    if (upTo !== undefined && current === upTo) return false;
    if (getComputedStyle(current).display === 'none') return true;
    current = current.parentElement;
  }
  return false;
}

function isSelectableInput(
  element: Element,
): element is HTMLInputElement & { select(): void } {
  return element instanceof HTMLInputElement && 'select' in element;
}

function focus(element: Element | null | undefined, { select = false } = {}) {
  if (element && (element as HTMLElement).focus) {
    const prev = document.activeElement;
    (element as HTMLElement).focus({ preventScroll: true });
    if (element !== prev && isSelectableInput(element) && select) element.select();
  }
}

// ─── FocusScopesStack ─────────────────────────────────────────────────────────
interface FocusScopeHandle {
  paused: boolean;
  pause(): void;
  resume(): void;
}

function createFocusScopesStack() {
  let stack: FocusScopeHandle[] = [];
  return {
    add(fs: FocusScopeHandle) {
      const active = stack[0];
      if (fs !== active) active?.pause();
      stack = stack.filter((s) => s !== fs);
      stack.unshift(fs);
    },
    remove(fs: FocusScopeHandle) {
      stack = stack.filter((s) => s !== fs);
      stack[0]?.resume();
    },
  };
}
const focusScopesStack = createFocusScopesStack();

function removeLinks(items: HTMLElement[]) {
  return items.filter((item) => item.tagName !== 'A');
}

// ─── FocusScope component ─────────────────────────────────────────────────────
interface FocusScopeProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  loop?: boolean;
  trapped?: boolean;
  onMountAutoFocus?: (event: Event) => void;
  onUnmountAutoFocus?: (event: Event) => void;
}

export const FocusScope = React.forwardRef<HTMLDivElement, FocusScopeProps>(
  (props, forwardedRef) => {
    const {
      asChild,
      loop = false,
      trapped = false,
      onMountAutoFocus: onMountAutoFocusProp,
      onUnmountAutoFocus: onUnmountAutoFocusProp,
      ...scopeProps
    } = props;

    const [container, setContainer] = React.useState<HTMLElement | null>(null);
    const containerRef = React.useRef<HTMLElement | null>(null); // identity guard
    const onMountAutoFocus = useCallbackRef(onMountAutoFocusProp);
    const onUnmountAutoFocus = useCallbackRef(onUnmountAutoFocusProp);
    const lastFocusedElementRef = React.useRef<Element | null>(null);

    // Stable callback (empty deps) so useComposedRefs doesn't create a new
    // function identity on every render - that would trigger React 19's
    // ref-cleanup→setup cycle which oscillates setState and causes an ∞ loop.
    // CRITICAL: do NOT reset containerRef on null cleanup - resetting the guard
    // allows the next setup call to re-trigger setContainer, perpetuating the loop.
    const nodeCallback = React.useCallback((node: HTMLElement | null) => {
      if (node !== null && node !== containerRef.current) {
        containerRef.current = node;
        setContainer(node);
      }
      // null cleanup intentionally ignored - containerRef stays set
    }, []); // setContainer & containerRef are stable

    const composedRefs = useComposedRefs<HTMLDivElement>(forwardedRef, nodeCallback);

    const focusScope = React.useRef<FocusScopeHandle>({
      paused: false,
      pause() { this.paused = true; },
      resume() { this.paused = false; },
    }).current;

    React.useEffect(() => {
      if (trapped) {
        const handleFocusIn = (event: FocusEvent) => {
          if (focusScope.paused || !container) return;
          const target = event.target as Element;
          if (container.contains(target)) {
            lastFocusedElementRef.current = target;
          } else {
            focus(lastFocusedElementRef.current as HTMLElement, { select: true });
          }
        };
        const handleFocusOut = (event: FocusEvent) => {
          if (focusScope.paused || !container) return;
          const relatedTarget = event.relatedTarget as Element | null;
          if (relatedTarget === null) return;
          if (!container.contains(relatedTarget)) {
            focus(lastFocusedElementRef.current as HTMLElement, { select: true });
          }
        };
        const handleMutations = (mutations: MutationRecord[]) => {
          const focusedElement = document.activeElement;
          if (focusedElement !== document.body) return;
          for (const mutation of mutations) {
            if (mutation.removedNodes.length > 0) focus(container);
          }
        };
        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);
        const mutationObserver = new MutationObserver(handleMutations);
        if (container) mutationObserver.observe(container, { childList: true, subtree: true });
        return () => {
          document.removeEventListener('focusin', handleFocusIn);
          document.removeEventListener('focusout', handleFocusOut);
          mutationObserver.disconnect();
        };
      }
    }, [trapped, container, focusScope.paused]);

    React.useEffect(() => {
      if (container) {
        focusScopesStack.add(focusScope);
        const previouslyFocusedElement = document.activeElement;
        const hasFocusedCandidate = container.contains(previouslyFocusedElement);
        if (!hasFocusedCandidate) {
          const mountEvent = new CustomEvent(AUTOFOCUS_ON_MOUNT, EVENT_OPTIONS);
          container.addEventListener(AUTOFOCUS_ON_MOUNT, onMountAutoFocus);
          container.dispatchEvent(mountEvent);
          if (!mountEvent.defaultPrevented) {
            focusFirst(removeLinks(getTabbableCandidates(container)), { select: true });
            if (document.activeElement === previouslyFocusedElement) focus(container);
          }
        }
        return () => {
          container.removeEventListener(AUTOFOCUS_ON_MOUNT, onMountAutoFocus);
          setTimeout(() => {
            const unmountEvent = new CustomEvent(AUTOFOCUS_ON_UNMOUNT, EVENT_OPTIONS);
            container.addEventListener(AUTOFOCUS_ON_UNMOUNT, onUnmountAutoFocus);
            container.dispatchEvent(unmountEvent);
            if (!unmountEvent.defaultPrevented) {
              focus((previouslyFocusedElement as HTMLElement) ?? document.body, { select: true });
            }
            container.removeEventListener(AUTOFOCUS_ON_UNMOUNT, onUnmountAutoFocus);
            focusScopesStack.remove(focusScope);
          }, 0);
        };
      }
    }, [container, onMountAutoFocus, onUnmountAutoFocus, focusScope]);

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!loop && !trapped) return;
        if (focusScope.paused) return;
        const isTabKey =
          event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey;
        const focusedElement = document.activeElement as HTMLElement;
        if (isTabKey && focusedElement) {
          const containerEl = event.currentTarget as HTMLElement;
          const [first, last] = getTabbableEdges(containerEl);
          const hasTabbableElementsInside = first && last;
          if (!hasTabbableElementsInside) {
            if (focusedElement === containerEl) event.preventDefault();
          } else {
            if (!event.shiftKey && focusedElement === last) {
              event.preventDefault();
              if (loop) focus(first, { select: true });
            } else if (event.shiftKey && focusedElement === first) {
              event.preventDefault();
              if (loop) focus(last, { select: true });
            }
          }
        }
      },
      [loop, trapped, focusScope.paused],
    );

    const Comp = asChild ? Slot : 'div';
    return (
      <Comp
        tabIndex={-1}
        {...scopeProps}
        ref={composedRefs as React.Ref<HTMLDivElement>}
        onKeyDown={handleKeyDown}
      />
    );
  },
);
FocusScope.displayName = 'FocusScope';

export const Root = FocusScope;
