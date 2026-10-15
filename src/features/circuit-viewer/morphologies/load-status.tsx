import { megabytes, StatusAction, StatusPill } from '@/features/viewer-3d/chrome/status';

import type { CSSProperties, ReactNode } from 'react';
import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { MorphologiesLoad, MorphologiesStop } from './use-circuit-morphologies';

const TOO_LARGE = 'This circuit is too large to show as morphologies';
const LEFT_OUT = 'Only the morphologies nearest the middle fit: zoom in to see more';
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
 * Over the cells: how far the pack has come, why the circuit stayed somas, or that some morphologies in view are left
 * out for the budget.
 */
export function MorphologiesStatus({
  load,
  stopped,
  leftOut = false,
  theme,
  place,
  onRetry,
  onDismiss,
}: {
  load: MorphologiesLoad;
  stopped: MorphologiesStop | null;
  /** Whether morphologies in view are left out, their somas alone drawn. */
  leftOut?: boolean;
  theme: ViewerTheme;
  place?: CSSProperties;
  onRetry(): void;
  onDismiss(): void;
}) {
  let pill: ReactNode = null;
  if (load.status === 'loading') {
    pill = <StatusPill text={loadingText(load)} kind="busy" theme={theme} place={place} />;
  } else if (load.status === 'ready' && leftOut) {
    pill = <StatusPill text={LEFT_OUT} kind="info" theme={theme} place={place} />;
  } else if (stopped) {
    const { text, retry } = stopNotice(stopped);
    pill = (
      <StatusPill text={text} kind="warning" theme={theme} place={place}>
        {retry && <StatusAction onClick={onRetry}>Try again</StatusAction>}
        <StatusAction onClick={onDismiss}>Dismiss</StatusAction>
      </StatusPill>
    );
  }
  return pill && <div className="pointer-events-none absolute inset-0 z-10">{pill}</div>;
}
