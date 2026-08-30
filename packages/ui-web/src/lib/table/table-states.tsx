import type { ComponentType, ReactNode } from "react";
import { AlertCircle, Inbox, RotateCw } from "lucide-react";

/*
 * Empty, error and loading are three different stories.
 *
 * Lists in this codebase used to collapse them: a failed request rendered
 * "No orders found", so a broken API looked like an empty table. The engine
 * takes them as separate inputs so that cannot happen again.
 */

export interface TableEmptyStateProps {
  title?: string;
  description?: ReactNode;
  icon?: ComponentType<{ size?: number; className?: string }>;
  action?: ReactNode;
}

export function TableEmptyState({
  title = "Nothing here yet",
  description,
  icon: Icon = Inbox,
  action,
}: TableEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Icon size={36} className="text-body opacity-30" />
      <div className="flex flex-col gap-1">
        <p className="text-heading text-sm font-semibold">{title}</p>
        {description && <p className="text-body text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export interface TableErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function TableErrorState({ message, onRetry }: TableErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 text-center">
      <AlertCircle size={36} className="text-status-cancelled-fg opacity-70" />
      <div className="flex flex-col gap-1">
        <p className="text-heading text-sm font-semibold">That did not load</p>
        <p className="text-body text-sm">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="border-line text-heading hover:bg-light-bg inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-300 ease-in-out"
        >
          <RotateCw size={14} />
          Try again
        </button>
      )}
    </div>
  );
}
