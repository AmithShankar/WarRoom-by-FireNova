export interface BackStackEnv {
  push: () => void;
  back: () => void;
  onPop: (fn: () => void) => void;
}

export interface BackStack {
  /** Pushes one history entry for an open sheet; returns `release` to drop it when the sheet closes another way. */
  open(close: () => void): () => void;
}

/**
 * Lets the system back button close the topmost open sheet instead of leaving the page.
 * Each open sheet owns one history entry. A user back pops the top sheet and calls its
 * `close`. `release` removes an entry with `env.back()`; the pop that causes is ignored,
 * whether the env delivers it synchronously (tests) or later (browser popstate).
 */
export function createBackStack(env: BackStackEnv): BackStack {
  const stack: { close: () => void }[] = [];
  let selfBacks = 0;

  env.onPop(() => {
    if (selfBacks > 0) {
      selfBacks--;
      return;
    }
    stack.pop()?.close();
  });

  return {
    open(close) {
      const entry = { close };
      stack.push(entry);
      env.push();
      return () => {
        const i = stack.indexOf(entry);
        if (i === -1) return; // already popped by back or released
        stack.splice(i, 1);
        selfBacks++;
        env.back();
      };
    },
  };
}

let browserStack: BackStack | null = null;

/** The shared browser instance, created on first use (client only). */
export function getBackStack(): BackStack {
  browserStack ??= createBackStack({
    push: () => window.history.pushState({ sheet: true }, ''),
    back: () => window.history.back(),
    onPop: (fn) => window.addEventListener('popstate', fn),
  });
  return browserStack;
}
