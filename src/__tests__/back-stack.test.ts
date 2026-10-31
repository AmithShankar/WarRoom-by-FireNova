import { describe, it, expect, beforeEach } from 'vitest';
import { createBackStack } from '@/lib/back-stack';

function createFakeEnv() {
  let listener: (() => void) | null = null;
  const env = {
    history: [] as string[],
    backCalls: 0,
    push: () => {
      env.history.push('sheet');
    },
    back: () => {
      env.history.pop();
      env.backCalls++;
      listener?.();
    },
    onPop: (fn: () => void) => {
      listener = fn;
    },
    // The user's system back button.
    pressBack: () => {
      env.history.pop();
      env.backCalls++;
      listener?.();
    },
  };
  return env;
}

describe('back stack', () => {
  let env: ReturnType<typeof createFakeEnv>;
  let stack: ReturnType<typeof createBackStack>;

  beforeEach(() => {
    env = createFakeEnv();
    stack = createBackStack(env);
  });

  it('back closes only the top sheet', () => {
    const closes: string[] = [];
    stack.open(() => closes.push('details'));
    stack.open(() => closes.push('warning'));
    env.pressBack();
    expect(closes).toEqual(['warning']);
  });

  it('releasing via X removes its entry without closing others', () => {
    const closes: string[] = [];
    stack.open(() => closes.push('details'));
    const release = stack.open(() => closes.push('warning'));
    release();
    expect(closes).toEqual([]);
    expect(env.history.length).toBe(1); // only the details entry remains
  });

  it('release after back is a no-op', () => {
    const release = stack.open(() => {});
    env.pressBack();
    release();
    expect(env.backCalls).toBe(1); // only the user's press
  });

  it('release is idempotent', () => {
    const release = stack.open(() => {});
    release();
    release();
    expect(env.backCalls).toBe(1);
    expect(env.history.length).toBe(0);
  });

  it('back after releasing the top sheet closes the one below', () => {
    const closes: string[] = [];
    stack.open(() => closes.push('details'));
    const release = stack.open(() => closes.push('warning'));
    release();
    env.pressBack();
    expect(closes).toEqual(['details']);
  });

  it('ignores a self-initiated pop that arrives later (async popstate)', () => {
    let listener: (() => void) | null = null;
    let pendingPops = 0;
    const closes: string[] = [];
    const asyncStack = createBackStack({
      push: () => {},
      back: () => {
        pendingPops++;
      },
      onPop: (fn) => {
        listener = fn;
      },
    });
    asyncStack.open(() => closes.push('details'));
    const release = asyncStack.open(() => closes.push('warning'));
    release();
    // The browser delivers the popstate for release() afterwards.
    while (pendingPops > 0) {
      pendingPops--;
      listener!();
    }
    expect(closes).toEqual([]);
    // A real user back now closes the remaining sheet.
    listener!();
    expect(closes).toEqual(['details']);
  });

  it('a back with no open sheet does nothing', () => {
    expect(() => env.pressBack()).not.toThrow();
  });
});
