import { LoadingOutlined } from '@ant-design/icons';
import { get } from 'es-toolkit/compat';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { ScanConfigGenerationError, ScanConfigGenerationStep } from '@/api/one/utils';
import { useAppNotification } from '@/components/notification';
import { useLowCredits } from '@/features/low-credits';
import { useFieldErrors } from '@/features/scan-config/components/hooks/field-errors';
import { useGenerateScanConfigCampaign } from '@/features/scan-config/components/hooks/use-generate-scan-config-campaign';
import { LAUNCH_GREEN } from '@/features/scan-config/components/shared/task-launch-button';
import { ScanConfigResultsTab } from '@/features/scan-config/helpers';
import {
  ScanConfigActivity,
  type TScanConfigActivity,
  type TScanConfigTabs,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import { messages } from '@/i18n/en/scan-config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { AiSparkles } from '@/ui/segments/project/brains-walkthrough/agent-ready';
import { assertErrorMessage, classNames } from '@/util/utils';

import type { ErrorObject } from 'ajv';
import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { Config } from '@/features/scan-config/types';

/**
 * A generate button that can be clicked: a soft shadow in the launch green's dark end, and a
 * slight grow under the pointer.
 */
export const GENERATE_CLICKABLE =
  'shadow-[0_3px_8px_-1px_rgb(20_56_5/0.3)] transition-[scale] duration-200 ease-out motion-safe:hover:scale-[1.02]';

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
  setConfig?: (config: Config) => void;
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
  // The campaign's name and description (Info) are asked for as it is generated, so their errors do not hold the
  // button back (a stopgap, the user asked)
  const blocking = (errors ?? []).filter((e) => !isInfoError(e));
  const hasBlockingErrors = blocking.length > 0 || fieldErrors.size > 0;
  const [asking, setAsking] = useState(false);
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
    generateCampaign.mutate({ config: withConfig, generatedApiUrl }, { onSettled: () => setLoading(false) });
  };

  const onClick = () => {
    if (loading || generateCampaign.isPending) return;
    if (campaignId) {
      setCampaignId('');
      return;
    }
    // no name or description yet: asked for over the button first
    if (setConfig && !infoFilled(config)) {
      setAsking(true);
      return;
    }
    generate(config);
  };

  return (
    <>
      {creditsModal}
      <button
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
          {!campaignId
            ? get(messages, `${activity}.Generate`, 'Generate campaign')
            : get(messages, `${activity}.New`, 'New campaign')}
          {loading && <LoadingOutlined />}
        </div>
      </button>
      {asking && (
        <CampaignInfoDialog onCancel={() => setAsking(false)}>
          <CampaignInfoForm
            config={config}
            activity={activity}
            onCancel={() => setAsking(false)}
            onDone={(info) => {
              const next = { ...config, info: { ...((config.info as object) ?? {}), ...info } } as Config;
              setConfig?.(next);
              setAsking(false);
              generate(next);
            }}
          />
        </CampaignInfoDialog>
      )}
    </>
  );
}

/**
 * The campaign's name and description asked for in the middle of the page, everything else blurred behind it (the
 * user asked); Escape or a click beside it puts it away.
 */
function CampaignInfoDialog({ onCancel, children }: { onCancel: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return createPortal(
    <div
      role="presentation"
      // on a phone near the top, clear of the keyboard that comes up under it (the user asked)
      className="animate-in fade-in-0 fixed inset-0 z-[1000] flex items-center justify-center bg-[rgb(240_243_248/0.45)] p-4 backdrop-blur-md duration-200 max-md:items-start max-md:px-3 max-md:pt-[calc(env(safe-area-inset-top)+12px)]"
      onPointerDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Name your campaign"
        className="animate-in zoom-in-95 fade-in-0 w-full max-w-[460px] rounded-3xl bg-white p-6 shadow-[0_24px_60px_-16px_rgb(0_39_102/0.35)] ring-1 ring-primary-9/5 duration-200 max-md:p-4"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/** An ajv error about the campaign's Info block: one of its fields, or the block missing altogether. */
function isInfoError(e: ErrorObject) {
  return (
    e.instancePath === '/info' ||
    e.instancePath.startsWith('/info/') ||
    (e.instancePath === '' && (e.params as { missingProperty?: string }).missingProperty === 'info')
  );
}

function infoFilled(config: Config) {
  const text = (path: string) => String(get(config, path) ?? '').trim();
  return !!text('info.campaign_name') && !!text('info.campaign_description');
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
    count('synaptic_manipulations') && plural(count('synaptic_manipulations'), 'synaptic manipulation', 'synaptic manipulations'),
  ].filter(Boolean) as string[];
  const length = Number(get(config, 'initialize.simulation_length'));
  const noun = ACTIVITY_NOUN[activity];
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const first = parts[0] ? ` with ${parts.slice(0, 2).join(' and ')}` : '';
  return {
    campaign_name: `${noun[0].toUpperCase()}${noun.slice(1)}${first} (${date})`,
    campaign_description:
      `A ${noun} campaign${Number.isFinite(length) && length > 0 ? ` of ${length} ms` : ''}` +
      `${parts.length ? `, with ${parts.join(', ')}` : ''}. ` +
      'Each combination of the values swept is run as a simulation of its own.',
  };
}

/** The campaign's name and description, both needed before it is generated, and a suggestion for them. */
function CampaignInfoForm({
  config,
  activity,
  onCancel,
  onDone,
}: {
  config: Config;
  activity: TScanConfigActivity;
  onCancel: () => void;
  onDone: (info: { campaign_name: string; campaign_description: string }) => void;
}) {
  const [name, setName] = useState(String(get(config, 'info.campaign_name') ?? ''));
  const [description, setDescription] = useState(String(get(config, 'info.campaign_description') ?? ''));
  const [thinking, setThinking] = useState(false);
  const ready = !!name.trim() && !!description.trim();
  // On a phone the keyboard waits for a tap, so the whole of it, and Suggest with AI, are seen first. Read from the
  // window as it opens (only ever opened by a click): a media query hook would still say "wide" at the first render,
  // when autofocus acts.
  const phone = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
  const field =
    'w-full rounded-xl border border-neutral-3 bg-white px-3 py-2 text-sm text-primary-9 outline-none placeholder:text-neutral-4 focus:border-primary-7';

  const suggest = () => {
    setThinking(true);
    // a moment's pause, as an assistant would take
    window.setTimeout(() => {
      const s = suggestInfo(config, activity);
      setName(s.campaign_name);
      setDescription(s.campaign_description);
      setThinking(false);
    }, 700);
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onDone({ campaign_name: name.trim(), campaign_description: description.trim() });
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-primary-9 text-base font-bold">Name your campaign</span>
          <span className="text-xs text-neutral-500">Both are needed before it is generated.</span>
        </div>
        <button
          type="button"
          onClick={suggest}
          disabled={thinking}
          className="border-primary-9/20 text-primary-9 hover:bg-primary-9/5 flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
        >
          {thinking ? <LoadingOutlined className="text-[12px]" /> : <AiSparkles className="size-3.5" />}
          Suggest with AI
        </button>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-primary-9 text-xs font-semibold">Campaign name</span>
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={!phone}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. VPM replay into the barrel column"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-primary-9 text-xs font-semibold">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What this campaign is for"
          className={classNames(field, 'resize-none')}
        />
      </label>
      <div className="mt-1 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-primary-9 rounded-full px-4 py-2 text-sm font-semibold hover:bg-neutral-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!ready}
          className={classNames(
            'rounded-full px-5 py-2 text-sm font-semibold',
            ready ? `${LAUNCH_GREEN} ${GENERATE_CLICKABLE} text-white` : 'bg-gray-200 text-gray-500'
          )}
        >
          Generate
        </button>
      </div>
    </form>
  );
}
