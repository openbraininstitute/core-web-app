import { ErrorBoundary } from 'react-error-boundary';
import React, { ErrorInfo, Suspense, useCallback } from 'react';

export type TSuspenseStatus = 'pending' | 'resolved' | 'error';

type Props = {
  id?: string;
  children: React.ReactNode;
  fallbackLoading?: ({ onMount }: { onMount: () => void }) => React.ReactNode;
  onStatusChange?: (status: TSuspenseStatus, extra?: any) => void;
  onErrorHandler?: (error: Error, info: ErrorInfo) => void;
} & (
  | {
      fallback?: never;
      withErrorBoundary?: false;
    }
  | {
      fallback: React.ReactNode;
      withErrorBoundary?: true;
    }
);

/**
 * A React component that wraps its children with `React.Suspense` and optionally an error boundary,
 * providing status updates via callbacks during the suspense lifecycle.
 *
 * @param id - A unique identifier for the suspense instance.
 * @param children - The content to render once the suspense resolves.
 * @param fallback - The fallback UI to display in case of an error (used by the error boundary).
 * @param withErrorBoundary - Whether to wrap children with an error boundary. Defaults to `true`.
 * @param fallbackLoading - Optional function to render a custom loading fallback. Receives an object with `onMount` callback.
 * @param onStatusChange - Optional callback invoked when the suspense status changes. Receives status and context.
 * @param onErrorHandler - Optional callback invoked when an error is caught by the error boundary.
 *
 * @remarks
 * - When `withErrorBoundary` is `true`, errors are caught and handled by the provided `onErrorHandler` and `onStatusChange`.
 * - The `onStatusChange` callback is called with `'pending'`, `'resolved'`, or `'error'` statuses.
 * - The `fallbackLoading` prop allows for custom loading ui with lifecycle awareness.
 */
export function SuspenseWithStatus({
  id,
  children,
  fallback,
  withErrorBoundary = true,
  fallbackLoading,
  onStatusChange,
  onErrorHandler,
}: Props) {
  const onPending = useCallback(() => {
    onStatusChange?.('pending');
  }, [id, onStatusChange]);

  const onResolve = useCallback(() => {
    onStatusChange?.('resolved', { id });
  }, [id, onStatusChange]);

  const onError = useCallback(
    (error: Error, info: ErrorInfo) => {
      onStatusChange?.('error', { id, error, info });
      onErrorHandler?.(error, info);
    },
    [id, onStatusChange, onErrorHandler]
  );

  return withErrorBoundary ? (
    <ErrorBoundary onError={onError} fallback={fallback}>
      <Suspense key={id} fallback={fallbackLoading?.({ onMount: onPending })}>
        <ResolvedComponent onMount={onResolve}>{children}</ResolvedComponent>
      </Suspense>
    </ErrorBoundary>
  ) : (
    <Suspense key={id} fallback={fallbackLoading?.({ onMount: onPending })}>
      <ResolvedComponent onMount={onResolve}>{children}</ResolvedComponent>
    </Suspense>
  );
}

/**
 * A React component that invokes a callback function when it is mounted and renders its children.
 *
 * @param onMount - A callback function that is called once when the component is mounted.
 * @param children - The React nodes to be rendered inside this component.
 *
 * @remarks
 * This component uses a `useEffect` hook to ensure that the `onMount` callback is called only once,
 * when the component is first rendered.
 */
function ResolvedComponent({
  onMount,
  children,
}: {
  onMount: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    onMount();
  }, [onMount]);
  return <>{children}</>;
}
