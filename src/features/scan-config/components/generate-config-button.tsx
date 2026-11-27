import { LoadingOutlined } from '@ant-design/icons';
import { get } from 'es-toolkit/compat';

import { generateButtonClass } from '@/features/scan-config/components/shared/box-class';
import { useHasIssues } from '@/features/scan-config/use-config-store';
import { messages } from '@/i18n/en/scan-config';

import type { TScanConfigActivity } from '@/features/scan-config/types';

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
      className={generateButtonClass(hasBlockingErrors || loading)}
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
