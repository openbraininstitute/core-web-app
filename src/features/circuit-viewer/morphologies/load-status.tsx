import { megabytes, StatusAction, StatusPill } from '@/features/viewer-3d/chrome/status';

import type { CSSProperties, ReactNode } from 'react';
import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { Fallback, Lost } from './engine/create-view';
import type { MorphologiesLoad, MorphologiesStop } from './use-circuit-morphologies';

const TOO_LARGE = 'This circuit is too large to show as morphologies';
const LEFT_OUT = 'Too many morphologies in view: zoom in to see them';
/** Where the browser has no WebGPU, which leaves out none. */
const WITH_WEBGPU = 'A browser with WebGPU shows them all';
const GAVE_OUT: Record<Lost, string> = {
  reset: 'Drawn with WebGL 2 after the graphics were reset',
  memory: 'Drawn with WebGL 2: the graphics ran out of memory',
};
/** By OBI-One's word for why it built no pack. */
const REFUSALS: Record<string, string> = {
  too_many_neurons: TOO_LARGE,
  files_too_large: TOO_LARGE,
  too_many_points: TOO_LARGE,
  too_many_segments: TOO_LARGE,
  no_morphologies: 'This circuit has no morphologies to show',
  busy: 'Morphologies are being built for another circuit',
};

function loadingText({ received, total }: { received: number; total: number }): string {
  if (received === 0) return 'Loading morphologies…';
  const of = total > 0 ? ` / ${megabytes(total)}` : '';
  return `Loading morphologies… ${megabytes(received)}${of} MB`;
}

/** What to say of a load that stopped, and whether asking again may help. */
function stopNotice(stopped: MorphologiesStop): { text: string; retry: boolean } {
  if (stopped.kind === 'failed') {
    return { text: 'The morphologies could not be loaded', retry: true };
  }
  return {
    text: REFUSALS[stopped.reason] ?? 'The morphologies cannot be shown',
    retry: stopped.reason === 'busy',
  };
}

/**
 * Over the cells: how far the pack has come, why the circuit stayed somas, that the morphologies in view are left out
 * for the budget (and where the browser has no WebGPU, that one with it shows them), or that they are drawn with WebGL
 * 2 since WebGPU gave out.
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
  if (load.status === 'loading') {
    pill = <StatusPill text={loadingText(load)} kind="busy" theme={theme} place={place} />;
  } else if (load.status === 'ready' && leftOut) {
    const text = fallback === 'missing' ? `${LEFT_OUT}. ${WITH_WEBGPU}` : LEFT_OUT;
    pill = <StatusPill text={text} kind="info" theme={theme} place={place} />;
  } else if (stopped) {
    const { text, retry } = stopNotice(stopped);
    pill = (
      <StatusPill text={text} kind="warning" theme={theme} place={place}>
        {retry && <StatusAction onClick={onRetry}>Try again</StatusAction>}
        <StatusAction onClick={onDismiss}>Dismiss</StatusAction>
      </StatusPill>
    );
  } else if (load.status === 'ready' && gaveOut) {
    pill = (
      <StatusPill text={gaveOut} kind="info" theme={theme} place={place}>
        <StatusAction onClick={onFallbackDismiss}>Dismiss</StatusAction>
      </StatusPill>
    );
  }
  return pill && <div className="pointer-events-none absolute inset-0 z-10">{pill}</div>;
}
