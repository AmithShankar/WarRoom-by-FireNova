'use client';

/**
 * Drop-in replacement for @radix-ui/react-dismissable-layer that fixes the
 * React 19 infinite loop. The original uses useState(null) + ref callback
 * setNode(node), which fires with null on every render cleanup in React 19.
 *
 * Fix: skip setNode when node is null.
 * asChild uses @radix-ui/react-slot (direct app dependency).
 */

import * as React from 'react';
import { flushSync } from 'react-dom';
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

// ─── Inlined: @radix-ui/primitive composeEventHandlers ───────────────────────
function composeEventHandlers<E>(
  originalEventHandler?: (event: E) => void,
  ourEventHandler?: (event: E) => void,
  { checkForDefaultPrevented = true } = {},
) {
  return function handleEvent(event: E) {
    originalEventHandler?.(event);
    if (
      checkForDefaultPrevented === false ||
      !(event as unknown as Event).defaultPrevented
    ) {
      ourEventHandler?.(event);
    }
  };
}

// ─── Inlined: @radix-ui/react-use-escape-keydown ─────────────────────────────
function useEscapeKeydown(
  onEscapeKeydownProp?: (event: KeyboardEvent) => void,
  ownerDocument: Document = globalThis?.document,
) {
  const onEscapeKeydown = useCallbackRef(onEscapeKeydownProp);
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscapeKeydown(event);
    };
    ownerDocument.addEventListener('keydown', handleKeyDown, { capture: true });
    return () =>
      ownerDocument.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onEscapeKeydown, ownerDocument]);
}

// ─── Inlined: dispatchDiscreteCustomEvent ────────────────────────────────────
function dispatchDiscreteCustomEvent<E extends CustomEvent>(
  target: EventTarget,
  event: E,
) {
  if (typeof document !== 'undefined') {
    flushSync(() => target.dispatchEvent(event));
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface DismissableLayerContextValue {
  layers: Set<HTMLElement>;
  layersWithOutsidePointerEventsDisabled: Set<HTMLElement>;
  branches: Set<HTMLElement>;
}

const DismissableLayerContext = React.createContext<DismissableLayerContextValue>({
  layers: new Set(),
  layersWithOutsidePointerEventsDisabled: new Set(),
  branches: new Set(),
});

// ─── Custom event names ───────────────────────────────────────────────────────
const CONTEXT_UPDATE = 'dismissableLayer.update';
const POINTER_DOWN_OUTSIDE = 'dismissableLayer.pointerDownOutside';
const FOCUS_OUTSIDE = 'dismissableLayer.focusOutside';

let originalBodyPointerEvents: string;

// ─── Hooks ────────────────────────────────────────────────────────────────────
function usePointerDownOutside(
  onPointerDownOutside?: (event: CustomEvent) => void,
  ownerDocument: Document = globalThis?.document,
) {
  const handlePointerDownOutside = useCallbackRef(onPointerDownOutside);
  const isPointerInsideReactTreeRef = React.useRef(false);
  const handleClickRef = React.useRef(() => {});

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target && !isPointerInsideReactTreeRef.current) {
        const eventDetail = { originalEvent: event };
        const handleAndDispatch = () => {
          handleAndDispatchCustomEvent(
            POINTER_DOWN_OUTSIDE,
            handlePointerDownOutside,
            eventDetail,
            { discrete: true },
          );
        };
        if (event.pointerType === 'touch') {
          ownerDocument.removeEventListener('click', handleClickRef.current);
          handleClickRef.current = handleAndDispatch;
          ownerDocument.addEventListener('click', handleClickRef.current, { once: true });
        } else {
          handleAndDispatch();
        }
      } else {
        ownerDocument.removeEventListener('click', handleClickRef.current);
      }
      isPointerInsideReactTreeRef.current = false;
    };
    const timerId = window.setTimeout(() => {
      ownerDocument.addEventListener('pointerdown', handlePointerDown);
    }, 0);
    return () => {
      window.clearTimeout(timerId);
      ownerDocument.removeEventListener('pointerdown', handlePointerDown);
      ownerDocument.removeEventListener('click', handleClickRef.current);
    };
  }, [ownerDocument, handlePointerDownOutside]);

  return {
    onPointerDownCapture: () => {
      isPointerInsideReactTreeRef.current = true;
    },
  };
}

function useFocusOutside(
  onFocusOutside?: (event: CustomEvent) => void,
  ownerDocument: Document = globalThis?.document,
) {
  const handleFocusOutside = useCallbackRef(onFocusOutside);
  const isFocusInsideReactTreeRef = React.useRef(false);

  React.useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      if (event.target && !isFocusInsideReactTreeRef.current) {
        const eventDetail = { originalEvent: event };
        handleAndDispatchCustomEvent(FOCUS_OUTSIDE, handleFocusOutside, eventDetail, {
          discrete: false,
        });
      }
    };
    ownerDocument.addEventListener('focusin', handleFocus);
    return () => ownerDocument.removeEventListener('focusin', handleFocus);
  }, [ownerDocument, handleFocusOutside]);

  return {
    onFocusCapture: () => {
      isFocusInsideReactTreeRef.current = true;
    },
    onBlurCapture: () => {
      isFocusInsideReactTreeRef.current = false;
    },
  };
}

function dispatchUpdate() {
  const event = new CustomEvent(CONTEXT_UPDATE);
  document.dispatchEvent(event);
}

function handleAndDispatchCustomEvent(
  name: string,
  handler: ((event: CustomEvent) => void) | undefined,
  detail: { originalEvent: Event },
  { discrete }: { discrete: boolean },
) {
  const target = detail.originalEvent.target as EventTarget;
  const event = new CustomEvent(name, { bubbles: false, cancelable: true, detail });
  if (handler) target.addEventListener(name, handler as EventListener, { once: true });
  if (discrete) {
    dispatchDiscreteCustomEvent(target, event);
  } else {
    target.dispatchEvent(event);
  }
}

// ─── DismissableLayer component ───────────────────────────────────────────────
interface DismissableLayerProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  disableOutsidePointerEvents?: boolean;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: CustomEvent) => void;
  onFocusOutside?: (event: CustomEvent) => void;
  onInteractOutside?: (event: CustomEvent) => void;
  onDismiss?: () => void;
}

export const DismissableLayer = React.forwardRef<HTMLDivElement, DismissableLayerProps>(
  (props, forwardedRef) => {
    const {
      asChild,
      disableOutsidePointerEvents = false,
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      onDismiss,
      ...layerProps
    } = props;

    const context = React.useContext(DismissableLayerContext);

    // FIX: use identity guard + stable useCallback so setNode is only called
    // when the DOM element truly changes, and the ref function identity stays
    // the same across renders (prevents React 19's ref oscillation loop).
    const [node, setNode] = React.useState<HTMLElement | null>(null);
    const nodeRef = React.useRef<HTMLElement | null>(null); // identity guard
    const ownerDocument = node?.ownerDocument ?? globalThis?.document;
    const [, force] = React.useState({});

    const nodeCallback = React.useCallback((node2: HTMLElement | null) => {
      if (node2 !== null && node2 !== nodeRef.current) {
        nodeRef.current = node2;
        setNode(node2);
      }
      // null cleanup intentionally ignored - nodeRef stays set to prevent
      // React 19's ref-cleanup→setup cycle from re-triggering setNode
    }, []); // setNode & nodeRef are stable

    const composedRefs = useComposedRefs<HTMLDivElement>(forwardedRef, nodeCallback);

    const layers = Array.from(context.layers);
    const [highestLayerWithOutsidePointerEventsDisabled] = [
      ...context.layersWithOutsidePointerEventsDisabled,
    ].slice(-1);
    const highestLayerWithOutsidePointerEventsDisabledIndex = layers.indexOf(
      highestLayerWithOutsidePointerEventsDisabled,
    );
    const index = node ? layers.indexOf(node) : -1;
    const isBodyPointerEventsDisabled = context.layersWithOutsidePointerEventsDisabled.size > 0;
    const isPointerEventsEnabled = index >= highestLayerWithOutsidePointerEventsDisabledIndex;

    const pointerDownOutside = usePointerDownOutside((event) => {
      const target = event.target as Node;
      const isPointerDownOnBranch = [...context.branches].some((branch) =>
        branch.contains(target),
      );
      if (!isPointerEventsEnabled || isPointerDownOnBranch) return;
      onPointerDownOutside?.(event);
      onInteractOutside?.(event);
      if (!event.defaultPrevented) onDismiss?.();
    }, ownerDocument);

    const focusOutside = useFocusOutside((event) => {
      const target = event.target as Node;
      const isFocusInBranch = [...context.branches].some((branch) =>
        branch.contains(target),
      );
      if (isFocusInBranch) return;
      onFocusOutside?.(event);
      onInteractOutside?.(event);
      if (!event.defaultPrevented) onDismiss?.();
    }, ownerDocument);

    useEscapeKeydown((event) => {
      const isHighestLayer = index === context.layers.size - 1;
      if (!isHighestLayer) return;
      onEscapeKeyDown?.(event);
      if (!event.defaultPrevented && onDismiss) {
        event.preventDefault();
        onDismiss();
      }
    }, ownerDocument);

    React.useEffect(() => {
      if (!node) return;
      if (disableOutsidePointerEvents) {
        if (context.layersWithOutsidePointerEventsDisabled.size === 0) {
          originalBodyPointerEvents = ownerDocument.body.style.pointerEvents;
          ownerDocument.body.style.pointerEvents = 'none';
        }
        context.layersWithOutsidePointerEventsDisabled.add(node);
      }
      context.layers.add(node);
      dispatchUpdate();
      return () => {
        if (
          disableOutsidePointerEvents &&
          context.layersWithOutsidePointerEventsDisabled.size === 1
        ) {
          ownerDocument.body.style.pointerEvents = originalBodyPointerEvents;
        }
      };
    }, [node, ownerDocument, disableOutsidePointerEvents, context]);

    React.useEffect(() => {
      return () => {
        if (!node) return;
        context.layers.delete(node);
        context.layersWithOutsidePointerEventsDisabled.delete(node);
        dispatchUpdate();
      };
    }, [node, context]);

    React.useEffect(() => {
      const handleUpdate = () => force({});
      document.addEventListener(CONTEXT_UPDATE, handleUpdate);
      return () => document.removeEventListener(CONTEXT_UPDATE, handleUpdate);
    }, []);

    const Comp = asChild ? Slot : 'div';
    return (
      <Comp
        {...layerProps}
        ref={composedRefs as React.Ref<HTMLDivElement>}
        style={{
          pointerEvents: isBodyPointerEventsDisabled
            ? isPointerEventsEnabled
              ? 'auto'
              : 'none'
            : undefined,
          ...props.style,
        }}
        onFocusCapture={composeEventHandlers(props.onFocusCapture, focusOutside.onFocusCapture)}
        onBlurCapture={composeEventHandlers(props.onBlurCapture, focusOutside.onBlurCapture)}
        onPointerDownCapture={composeEventHandlers(
          props.onPointerDownCapture,
          pointerDownOutside.onPointerDownCapture,
        )}
      />
    );
  },
);
DismissableLayer.displayName = 'DismissableLayer';

// ─── DismissableLayerBranch ───────────────────────────────────────────────────
export const DismissableLayerBranch = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>((props, forwardedRef) => {
  const { asChild, ...rest } = props;
  const context = React.useContext(DismissableLayerContext);
  const ref = React.useRef<HTMLDivElement>(null);
  const composedRefs = useComposedRefs<HTMLDivElement>(forwardedRef, ref);

  React.useEffect(() => {
    const node = ref.current;
    if (node) {
      context.branches.add(node);
      return () => {
        context.branches.delete(node);
      };
    }
  }, [context.branches]);

  const Comp = asChild ? Slot : 'div';
  return <Comp {...rest} ref={composedRefs as React.Ref<HTMLDivElement>} />;
});
DismissableLayerBranch.displayName = 'DismissableLayerBranch';

export const Root = DismissableLayer;
export const Branch = DismissableLayerBranch;
