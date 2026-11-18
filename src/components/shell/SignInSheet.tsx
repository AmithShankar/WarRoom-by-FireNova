'use client';

import { useState } from 'react';
import { HelpCircle, LogIn, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { FanContentNotice } from './FanContentNotice';

export interface SignInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Message = { tone: 'warning' | 'danger'; text: string };

const NOT_LEADER = 'Only the Leader and Co-Leaders can make changes. You can still view everything.';
const INVALID_TOKEN = "That token didn't match. Tokens expire, so grab a fresh one from the game.";
const RATE_LIMITED = 'Too many sign-in attempts. Please wait a minute and try again.';

export function SignInSheet({ open, onOpenChange }: SignInSheetProps) {
  const isDesktop = useIsDesktop();
  const utils = trpc.useUtils();
  const [tag, setTag] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState<Message | null>(null);

  const close = (next: boolean) => {
    if (!next) {
      setTag('');
      setToken('');
      setMessage(null);
    }
    onOpenChange(next);
  };

  const signIn = trpc.auth.signIn.useMutation({
    onSuccess: (data) => {
      if (data.result === 'ok') {
        utils.auth.me.invalidate();
        close(false);
        toast.success(`Welcome, ${data.name || 'Leader'}!`, {
          description: 'You are now signed in with editor permissions.',
        });
        return;
      }
      setToken('');
      if (data.result === 'rate_limited') {
        setMessage({ tone: 'danger', text: RATE_LIMITED });
        return;
      }
      setMessage(
        data.result === 'not_leader'
          ? { tone: 'warning', text: NOT_LEADER }
          : { tone: 'danger', text: INVALID_TOKEN },
      );
    },
    onError: (err) => {
      setMessage({
        tone: 'danger',
        text: err.message.includes('Could not reach Clash of Clans')
          ? 'Could not reach Clash of Clans. Please try again in a moment.'
          : 'Sign in is not available right now. Please try again later.',
      });
    },
  });

  const trimmedTag = tag.trim();
  const trimmedToken = token.trim();
  const canSubmit = !!trimmedTag && !!trimmedToken && !signIn.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setMessage(null);
    signIn.mutate({ tag: trimmedTag, token: trimmedToken });
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className="p-0 sm:max-w-xl"
        aria-describedby={undefined}
      >
        <SheetHeader className="px-5 pt-6 sm:px-7 sm:pt-7">
          <div className="pr-8">
            <SheetTitle className="text-lg sm:text-xl font-bold tracking-tight">Sign in</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm text-text-2 mt-1">
              For the Leader and Co-Leaders to make changes.
            </SheetDescription>
          </div>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-auto px-5 py-5 sm:px-7 sm:py-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="signin-tag"
                  className="block text-xs sm:text-sm font-semibold uppercase tracking-wider text-text-2"
                >
                  Player tag
                </label>
                <span className="text-xs text-text-3 font-mono">e.g. #ABC123</span>
              </div>
              <Input
                id="signin-tag"
                value={tag}
                onChange={e => setTag(e.target.value.toUpperCase())}
                placeholder="#ABC123"
                maxLength={20}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="font-mono uppercase text-sm sm:text-base h-10 sm:h-11"
              />
            </div>

            <div>
              <label
                htmlFor="signin-token"
                className="mb-1.5 block text-xs sm:text-sm font-semibold uppercase tracking-wider text-text-2"
              >
                API token
              </label>
              <Input
                id="signin-token"
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Paste API token from game settings"
                maxLength={100}
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-sm sm:text-base h-10 sm:h-11"
              />
            </div>

            {/* Step-by-step instructions card */}
            <div className="rounded-xl border border-border-1 bg-surface-2/60 p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-text-1">
                <HelpCircle className="h-4 w-4 text-brand-from" />
                <span>How to find your Tag & API Token</span>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-text-2">
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-bold text-text-1">
                    1
                  </span>
                  <div className="leading-relaxed">
                    <strong className="text-text-1 font-semibold">Player Tag:</strong> In Clash of Clans, tap your XP level badge (top-left) to open <span className="text-text-1 font-medium">My Profile</span>. Tap the in-game <span className="text-text-1 font-medium">copy icon</span> next to your tag under your village name.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-bold text-text-1">
                    2
                  </span>
                  <div className="leading-relaxed">
                    <strong className="text-text-1 font-semibold">API Token:</strong> In Clash of Clans, tap the <span className="text-text-1 font-medium">Settings gear</span> (bottom-right) &rarr; <span className="text-text-1 font-medium">More Settings</span> &rarr; scroll to the bottom &rarr; tap <span className="text-text-1 font-medium">Show</span> next to <span className="text-text-1 font-medium">&quot;API Token&quot;</span>.
                    <p className="mt-1 text-[11px] sm:text-xs text-text-3">
                      Supercell generates this temporary token so you never share passwords or Supercell ID.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {message && (
              <div
                role="alert"
                className={
                  message.tone === 'warning'
                    ? 'rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs sm:text-sm text-amber-600 dark:text-amber-400'
                    : 'rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs sm:text-sm text-red-500'
                }
              >
                {message.text}
              </div>
            )}

            <p className="text-xs sm:text-sm text-text-3 leading-relaxed">
              Your token is checked once with Supercell through RoyaleAPI&apos;s proxy and never saved.
              We never ask for your Supercell ID or password.
            </p>

            <FanContentNotice />
          </div>

          <SheetFooter className="px-5 pb-6 sm:px-7 sm:pb-7 flex gap-2">
            <SheetClose asChild>
              <Button type="button" variant="ghost" className="h-10 sm:h-11 text-xs sm:text-sm">Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={!canSubmit} className="h-10 sm:h-11 text-xs sm:text-sm px-5">
              <LogIn className="h-4 w-4" /> {signIn.isPending ? 'Checking…' : 'Sign in'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
