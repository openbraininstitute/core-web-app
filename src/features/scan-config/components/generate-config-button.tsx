import { LoadingOutlined } from '@ant-design/icons';
import { get } from 'es-toolkit/compat';
import { useRef, useState } from 'react';

import { ScanConfigGenerationError, ScanConfigGenerationStep } from '@/api/one/utils';
import { useAppNotification } from '@/components/notification';
import { useLowCredits } from '@/features/low-credits';
import { CampaignInfoDialog } from '@/features/scan-config/components/campaign-info/dialog';
import {
  campaignInfoOf,
  infoBlockKey,
  withCampaignInfo,
} from '@/features/scan-config/components/campaign-info/info-block';
import { useFieldErrors } from '@/features/scan-config/components/hooks/field-errors';
import { useGenerateScanConfigCampaign } from '@/features/scan-config/components/hooks/use-generate-scan-config-campaign';
import {
  GENERATE_CLICKABLE,
  LAUNCH_GREEN,
} from '@/features/scan-config/components/shared/task-launch-button';
import { ScanConfigResultsTab } from '@/features/scan-config/helpers';
import {
  ScanConfigActivity,
  type TScanConfigActivity,
  type TScanConfigTabs,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import { messages } from '@/i18n/en/scan-config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { assertErrorMessage, classNames } from '@/util/utils';

import type { ErrorObject } from 'ajv';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { Config, ConfigSchema } from '@/features/scan-config/types';

const LOW_CREDITS_SUBJECT: Record<TScanConfigActivity, string> = {
  [ScanConfigActivity.Simulate]: 'run the simulation',
  [ScanConfigActivity.Extract]: 'run the extraction',
  [ScanConfigActivity.Process]: 'run the skeletonization',
  [ScanConfigActivity.Build]: 'build the model',
  [ScanConfigActivity.Optimize]: 'run the optimization',
  [ScanConfigActivity.Validate]: 'run the validation',
};

const FAILURE_MESSAGE_KEY: Record<string, string> = {
  [ScanConfigGenerationStep.CoordinateCount]: 'CoordinateCountFailed',
  [ScanConfigGenerationStep.Generation]: 'ScanConfigGenerateGridFailed',
  [ScanConfigGenerationStep.EmptyCampaignId]: 'ScanConfigGenerateGridCampaignIdFailed',
};

export default function GenerateConfigButton({
  loading,
  errors,
  campaignId,
  setCampaignId,
  setLoading,
  config,
  setConfig,
  schema,
  setTab,
  activity,
  generatedApiUrl,
  entityType,
  campaignEntityType,
}: {
  loading: boolean;
  errors: ErrorObject<string, Record<string, any>, unknown>[] | null | undefined;
  campaignId: string;
  setCampaignId: (campaignId: string) => void;
  setLoading: (loading: boolean) => void;
  config: Config;
  setConfig: (config: Config) => void;
  schema: ConfigSchema;
  setTab: (tab: TScanConfigTabs) => void;
  activity: TScanConfigActivity;
  generatedApiUrl: string;
  entityType: TSupportedEntityTypesForScanConfiguration;
  campaignEntityType?: TExtendedEntitiesTypeDict;
}) {
  const { projectId, virtualLabId } = useWorkspace();
  // ajv schema errors plus field-level errors (e.g. duplicate group names) that
  // schema validation can't catch; either kind blocks generation
  const fieldErrors = useFieldErrors();
  const hasBlockingErrors = (!!errors && errors.length > 0) || fieldErrors.size > 0;
  // The campaign's name and description hold nothing up while the config is edited (their errors
  // are not among `errors`): pressing Generate shows both first, to fill in or to change.
  const infoKey = infoBlockKey(schema);
  const [asking, setAsking] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const notification = useAppNotification();
  // Generation doesn't consume credits (issue #250): don't gate on balance.
  const { reportError: reportLowCredits, creditsModal } = useLowCredits({
    context: { virtualLabId, projectId },
    subject: LOW_CREDITS_SUBJECT[activity],
  });

  const generateCampaign = useGenerateScanConfigCampaign({
    ctx: { virtualLabId, projectId },
    activity,
    entityType,
    campaignEntityType,
    onSuccess: (newCampaignId) => {
      setCampaignId(newCampaignId);
      setTab(ScanConfigResultsTab[activity]);
    },
    onError: (error) => {
      if (!(error instanceof ScanConfigGenerationError)) {
        notification.error({ message: assertErrorMessage(error) });
        return;
      }
      if (reportLowCredits(error.body)) return;

      notification.error({
        message: get(messages, `${activity}.${FAILURE_MESSAGE_KEY[error.step]}`),
        description:
          error.step === ScanConfigGenerationStep.EmptyCampaignId ? undefined : error.message,
      });
    },
  });

  const generate = (withConfig: Config) => {
    setLoading(true);
    generateCampaign.mutate(
      { config: withConfig, generatedApiUrl },
      { onSettled: () => setLoading(false) }
    );
  };

  const onClick = () => {
    if (loading || generateCampaign.isPending) return;
    if (campaignId) {
      setCampaignId('');
      return;
    }
    // every time, filled in or not: the last chance to change them
    if (infoKey) {
      setAsking(true);
      return;
    }
    generate(config);
  };

  const generateLabel = get(messages, `${activity}.Generate`, 'Generate campaign');

  return (
    <>
      {creditsModal}
      <button
        ref={buttonRef}
        type="button"
        data-testid="scan-config-submit"
        className={classNames(
          // The 3D Player button's font in the launch button's green.
          'flex min-h-12.5 p-2 w-full items-center justify-center rounded-full text-sm font-semibold ring-1 ring-black/5',
          hasBlockingErrors || loading
            ? 'bg-gray-300 text-gray-500'
            : `${LAUNCH_GREEN} ${GENERATE_CLICKABLE} text-white`
        )}
        onClick={onClick}
        disabled={hasBlockingErrors || loading}
      >
        <div className="flex justify-between gap-5">
          {!campaignId ? generateLabel : get(messages, `${activity}.New`, 'New campaign')}
          {loading && <LoadingOutlined />}
        </div>
      </button>
      {asking && infoKey && (
        <CampaignInfoDialog
          initial={campaignInfoOf(config, infoKey)}
          submitLabel={generateLabel}
          suggest={() => suggestInfo(config, activity)}
          onCancel={(typed) => {
            // kept in the Info block, to go on with there or the next time
            setConfig(withCampaignInfo(config, infoKey, typed));
            setAsking(false);
            buttonRef.current?.focus();
          }}
          onDone={(info) => {
            const named = withCampaignInfo(config, infoKey, info);
            setConfig(named);
            setAsking(false);
            generate(named);
          }}
        />
      )}
    </>
  );
}

const ACTIVITY_NOUN: Record<TScanConfigActivity, string> = {
  [ScanConfigActivity.Simulate]: 'simulation',
  [ScanConfigActivity.Extract]: 'extraction',
  [ScanConfigActivity.Process]: 'processing',
  [ScanConfigActivity.Build]: 'build',
  [ScanConfigActivity.Optimize]: 'optimization',
  [ScanConfigActivity.Validate]: 'validation',
};

/**
 * A stand-in for the assistant (neuroagent cannot be asked from here yet): a name and a description made from the
 * config itself, what it simulates, for how long and with what, and today's date.
 */
function suggestInfo(config: Config, activity: TScanConfigActivity) {
  const count = (key: string) => {
    const v = (config as Record<string, unknown>)[key];
    return v && typeof v === 'object' ? Object.keys(v).length : 0;
  };
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const parts = [
    count('neuron_sets') && plural(count('neuron_sets'), 'neuron set', 'neuron sets'),
    count('stimuli') && plural(count('stimuli'), 'stimulus', 'stimuli'),
    count('recordings') && plural(count('recordings'), 'recording', 'recordings'),
    count('synaptic_manipulations') &&
      plural(count('synaptic_manipulations'), 'synaptic manipulation', 'synaptic manipulations'),
  ].filter(Boolean) as string[];
  const length = Number(get(config, 'initialize.simulation_length'));
  const noun = ACTIVITY_NOUN[activity];
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const first = parts[0] ? ` with ${parts.slice(0, 2).join(' and ')}` : '';
  return {
    campaign_name: `${noun[0].toUpperCase()}${noun.slice(1)}${first} (${date})`,
    campaign_description:
      `A ${noun} campaign${Number.isFinite(length) && length > 0 ? ` of ${length} ms` : ''}` +
      `${parts.length ? `, with ${parts.join(', ')}` : ''}. ` +
      'Each combination of the values swept is run as a simulation of its own.',
  };
}
