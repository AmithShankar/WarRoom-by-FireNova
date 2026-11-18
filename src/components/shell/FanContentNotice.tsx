import { cn } from '@/lib/utils';

export function FanContentNotice({ className }: { className?: string }) {
  return (
    <p className={cn('text-[11px] leading-relaxed text-text-3', className)}>
      This material is unofficial and is not endorsed by Supercell. For more information see
      Supercell&apos;s Fan Content Policy:{' '}
      <a
        href="https://www.supercell.com/fan-content-policy"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-text-2"
      >
        www.supercell.com/fan-content-policy
      </a>
    </p>
  );
}
