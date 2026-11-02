import { megabytes, StatusAction, StatusPill } from '@/features/viewer-3d/chrome/status';

import type { CSSProperties, ReactNode } from 'react';
import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { Fallback, Lost } from './engine/create-view';
import type { MorphologiesLoad, MorphologiesStop } from './use-circuit-morphologies';

const LEFT_OUT = 'Too many morphologies in view: zoom in to see them';
/** Where the browser has no WebGPU, which leaves out none. */
const WITH_WEBGPU = 'A browser with WebGPU shows them all';
const GAVE_OUT: Record<Lost, string> = {
  reset: 'Drawn with WebGL 2 after the graphics were reset',
  memory: 'Drawn with WebGL 2: the graphics ran out of memory',
};
const STOPPED: Record<MorphologiesStop, string> = {
  failed: 'The morphologies could not be loaded',
  cut: 'Not all of the morphologies could be loaded',
};

function loadingText({ received, total }: { received: number; total: number }): string {
  if (received === 0) return 'Loading morphologies…';
  return `Loading morphologies… ${megabytes(received)} / ${megabytes(total)} MB`;
}

/**
 * Over the cells: how far the pack has come before it is shown, that it could not be loaded or the rest of it did not
 * come in, that the morphologies in view are left out for the budget (and where the browser has no WebGPU, that one with it shows them), that they are
 * drawn with WebGL 2 since WebGPU gave out, or, where there is nothing else to say, how far the rest has come.
 */
export function MorphologiesStatus({
  load,
  stopped,
  leftOut = false,
  fallback = null,
  theme,
  place,
  onRetry,
  onDismiss,
  onFallbackDismiss,
}: {
  load: MorphologiesLoad;
  stopped: MorphologiesStop | null;
  /** Whether morphologies in view are left out, their somas alone drawn. */
  leftOut?: boolean;
  /** Why WebGL 2 draws them where WebGPU was asked for. */
  fallback?: Fallback | null;
  theme: ViewerTheme;
  place?: CSSProperties;
  onRetry(): void;
  onDismiss(): void;
  onFallbackDismiss(): void;
}) {
  let pill: ReactNode = null;
  const gaveOut = fallback && fallback !== 'missing' ? GAVE_OUT[fallback] : null;
  const busy = (of: { received: number; total: number }) => (
    <StatusPill text={loadingText(of)} kind="busy" theme={theme} place={place} />
  );
  if (load.status === 'loading') {
    pill = busy(load);
  } else if (stopped) {
    pill = (
      <StatusPill text={STOPPED[stopped]} kind="warning" theme={theme} place={place}>
        <StatusAction onClick={onRetry}>Try again</StatusAction>
        <StatusAction onClick={onDismiss}>Dismiss</StatusAction>
      </StatusPill>
    );
  } else if (load.status === 'ready' && leftOut) {
    const text = fallback === 'missing' ? `${LEFT_OUT}. ${WITH_WEBGPU}` : LEFT_OUT;
    pill = <StatusPill text={text} kind="info" theme={theme} place={place} />;
  } else if (load.status === 'ready' && gaveOut) {
    pill = (
      <StatusPill text={gaveOut} kind="info" theme={theme} place={place}>
        <StatusAction onClick={onFallbackDismiss}>Dismiss</StatusAction>
      </StatusPill>
    );
  } else if (load.status === 'ready' && load.coming) {
    pill = busy(load.coming);
  }
  return pill && <div className="pointer-events-none absolute inset-0 z-10">{pill}</div>;
}
