'use client';

import { WifiOff } from 'lucide-react';
import { Card } from './card';
import { Button } from './button';

export function QueryError({
  message = "Something went wrong loading this section.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <WifiOff className="h-6 w-6 text-text-3" />
      <p className="text-sm text-text-2">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Card>
  );
}
