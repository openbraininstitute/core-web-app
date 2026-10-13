import { megabytes, StatusAction, StatusPill } from '@/features/viewer-3d/chrome/status';

import type { ReactNode } from 'react';
import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { MorphologiesLoad, MorphologiesStop } from './use-circuit-morphologies';

const TOO_LARGE = 'This circuit is too large to show as morphologies';
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

/** Over the cells: how far the pack has come, or why the circuit stayed somas. */
export function MorphologiesStatus({
  load,
  stopped,
  theme,
  onRetry,
  onDismiss,
}: {
  load: MorphologiesLoad;
  stopped: MorphologiesStop | null;
  theme: ViewerTheme;
  onRetry(): void;
  onDismiss(): void;
}) {
  let pill: ReactNode = null;
  if (load.status === 'loading') {
    pill = <StatusPill text={loadingText(load)} failed={false} theme={theme} />;
  } else if (stopped) {
    const { text, retry } = stopNotice(stopped);
    pill = (
      <StatusPill text={text} failed theme={theme}>
        {retry && <StatusAction onClick={onRetry}>Try again</StatusAction>}
        <StatusAction onClick={onDismiss}>Dismiss</StatusAction>
      </StatusPill>
    );
  }
  return pill && <div className="pointer-events-none absolute inset-0 z-10">{pill}</div>;
}
