import { LoadingOutlined } from '@ant-design/icons';
import { get } from 'es-toolkit/compat';

import { LAUNCH_GREEN } from '@/features/scan-config/components/shared/task-launch-button';
import { useHasIssues } from '@/features/scan-config/use-config-store';
import { messages } from '@/i18n/en/scan-config';
import { classNames } from '@/util/utils';

import type { TScanConfigActivity } from '@/features/scan-config/types';

/**
 * A generate button that can be clicked: a soft shadow in the launch green's dark end, and a
 * slight grow under the pointer.
 */
export const GENERATE_CLICKABLE =
  'shadow-[0_3px_8px_-1px_rgb(20_56_5/0.3)] transition-[scale] duration-200 ease-out motion-safe:hover:scale-[1.02]';

/** The submit button of `ScanConfigForm`: "Generate", or "New" once a campaign exists. */
export default function GenerateConfigButton({
  loading,
  campaignId,
  activity,
}: {
  loading: boolean;
  campaignId: string;
  activity: TScanConfigActivity;
}) {
  const hasBlockingErrors = useHasIssues('');

  return (
    <button
      type="submit"
      data-testid="scan-config-submit"
      className={classNames(
        // The 3D Player button's font in the launch button's green.
        'flex min-h-12.5 p-2 w-full items-center justify-center rounded-full text-sm font-semibold ring-1 ring-black/5',
        hasBlockingErrors || loading
          ? 'bg-gray-300 text-gray-500'
          : `${LAUNCH_GREEN} ${GENERATE_CLICKABLE} text-white`
      )}
      disabled={hasBlockingErrors || loading}
    >
      <div className="flex justify-between gap-5">
        {!campaignId
          ? get(messages, `${activity}.Generate`, 'Generate campaign')
          : get(messages, `${activity}.New`, 'New campaign')}
        {loading && <LoadingOutlined />}
      </div>
    </button>
  );
}
