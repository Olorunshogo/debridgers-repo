import { useCallback, useState } from "react";

/*
 * Tracks one async dialog action through its full lifecycle.
 *
 * Every dialog that submits something uses this instead of its own loading and
 * error useState pair, so the four states are handled identically everywhere.
 * The 'success' state exists to be rendered (see DialogSuccessPanel) rather than
 * skipped by closing the dialog the moment the promise resolves.
 */

export type DialogSubmissionStatus =
  | "idle"
  | "submitting"
  | "error"
  | "success";

export interface UseDialogSubmissionResult<T> {
  status: DialogSubmissionStatus;
  error: string | null;
  /** Value the action resolved with, for success copy that needs it. */
  data: T | null;
  run: (action: () => Promise<T>) => Promise<T | undefined>;
  reset: () => void;
  isSubmitting: boolean;
}

export function useDialogSubmission<T = void>(): UseDialogSubmissionResult<T> {
  const [status, setStatus] = useState<DialogSubmissionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const reset = useCallback((): void => {
    setStatus("idle");
    setError(null);
    setData(null);
  }, []);

  const run = useCallback(
    async (action: () => Promise<T>): Promise<T | undefined> => {
      setStatus("submitting");
      setError(null);

      try {
        const result = await action();
        setData(result);
        setStatus("success");
        return result;
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Something went wrong. Please try again.",
        );
        setStatus("error");
        return undefined;
      }
    },
    [],
  );

  return {
    status,
    error,
    data,
    run,
    reset,
    isSubmitting: status === "submitting",
  };
}
