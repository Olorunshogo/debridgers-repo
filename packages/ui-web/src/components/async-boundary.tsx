import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";

/*
 * The one place a first-load fetch decides what the screen shows.
 *
 * Dashboard pages had each grown their own `loading || !data` skeleton guard and
 * then swallowed the failure with `.catch(() => {})`, so a dead endpoint looked
 * identical to an empty result. Paired with `useAsyncResource`, this makes the four
 * outcomes - loading, failed, empty, ready - explicit and consistent, and gives
 * the failure a retry rather than a permanent skeleton. The error visuals mirror
 * the marketing shop's error state (AlertCircle, muted copy, pill button).
 */

export interface AsyncBoundaryProps {
  loading: boolean;
  error: Error | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  skeleton?: React.ReactNode;
  empty?: React.ReactNode;
  children: React.ReactNode;
}

function DefaultSkeleton() {
  return <div className="bg-line h-40 w-full animate-pulse rounded-2xl" />;
}

export function AsyncBoundary({
  loading,
  error,
  onRetry,
  isEmpty = false,
  skeleton,
  empty,
  children,
}: AsyncBoundaryProps) {
  if (loading) {
    return <>{skeleton ?? <DefaultSkeleton />}</>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <AlertCircle size={48} className="text-body opacity-30" />
        <p className="text-body text-sm">
          Could not load this. Check your connection and try again.
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              "bg-primary rounded-full px-6 py-3 text-sm font-semibold text-white",
              "transition-opacity hover:opacity-90",
            )}
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return <>{empty ?? null}</>;
  }

  return <>{children}</>;
}

AsyncBoundary.displayName = "AsyncBoundary";
