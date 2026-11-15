'use client';

import { RiFileCopyLine } from '@remixicon/react';
import { get } from 'es-toolkit/compat';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { useAppNotification } from '@/components/notification';
import { useFlags } from '@/features/feature-flags/provider';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { resolveWorkflowEntityRefs } from '@/features/scan-config/workflow/workflow-schema-selection';
import { configTimeline, describeBlock } from '@/features/spike-viewer/config-timeline';
import { executionStatusColorMap } from '@/features/task-runner/activity-execution/color-map';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  resolveWorkflowConfigureHrefForEntity,
  WorkflowConfigureOutcomeDict,
} from '@/ui/segments/workflows/config/entity-entry';

import { BlockCard, DefaultCard, EntityCard, EntityGroupCard, useExistingEntityIds } from './cards';
import { blocksNaming, entityIdsIn, groupRefs, refTypeLabel } from './grouping';
import { timeTicks, withoutInfo } from './layout';
import { PreviewDrawer } from './preview';
import { PreviewContext } from './preview-context';
import { RunSheet } from './run-sheet';
import { STATUS_WORD } from './runs-model';
import { buildBlockGraph } from './settings-graph';
import { useSimulationSheet } from './simulation-sheet';
import { useTaskSheet } from './task-sheet';

import type { ReactNode } from 'react';
import type { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import type { Config, ConfigSchema, TScanConfigActivity } from '@/features/scan-config/types';
import type { TWorkflowTaskTypeBindings } from '@/features/scan-config/workflow/types';
import type { TPreviewRef } from './preview-context';
import type { TSheetItem } from './run-sheet';
import type { BlockGraphNode } from './settings-graph';

type Props = {
  activity: TScanConfigActivity;
  campaignId: string;
  schema: ConfigSchema;
  config: Config;
  /** The model the editor opened on, for configs that name no input of their own. */
  entityId: string | undefined;
  taskTypeBindings: TWorkflowTaskTypeBindings | undefined;
  onOpenBlock: (block: { rootElement: string; entry: string }) => void;
  /** Opens the results tab, on a simulation (and file) where there is one to name. */
  onOpenResults: (simulationId?: string, assetId?: string) => void;
};

const PALETTE = ['#2563eb', '#7c3aed', '#d97706', '#db2777', '#0891b2', '#65a30d', '#dc2626'];

/** A campaign, inputs → settings → runs → outputs, linked: the default view of a past campaign. */
export function CampaignOverview(props: Props) {
  if (props.activity === ScanConfigActivity.Simulate) return <SimulationOverview {...props} />;
  if (props.taskTypeBindings) return <TaskOverview {...props} bindings={props.taskTypeBindings} />;
  return null;
}

function SimulationOverview(props: Props) {
  const durationMs = numberOrUndefined(get(props.config, 'initialize.simulation_length'));
  const sheet = useSimulationSheet({
    campaignId: props.campaignId,
    durationMs,
    onOpenSimulation: props.onOpenResults,
  });
  return (
    <OverviewLayout
      {...props}
      sheet={sheet}
      footer={<Timeline schema={props.schema} config={props.config} durationMs={durationMs} />}
    />
  );
}

function TaskOverview(props: Props & { bindings: TWorkflowTaskTypeBindings }) {
  const sheet = useTaskSheet({
    campaignId: props.campaignId,
    bindings: props.bindings,
    onOpenResults: () => props.onOpenResults(),
  });
  return <OverviewLayout {...props} sheet={sheet} />;
}

function OverviewLayout({
  activity,
  campaignId,
  schema,
  config,
  entityId,
  onOpenBlock,
  sheet,
  footer,
}: Props & {
  sheet: {
    rows: Array<{ status: ActivityStatus }>;
    runs: ReactNode;
    runsHeight: number;
    outputs: TSheetItem[];
    outputsReady: boolean;
  };
  footer?: ReactNode;
}) {
  const settings = useMemo(() => withoutInfo(buildBlockGraph(schema, config)), [schema, config]);
  // the entity previewed beside the canvas
  const [preview, setPreview] = useState<TPreviewRef | null>(null);
  const closePreview = useCallback(() => setPreview(null), []);
  // ids the blocks pick that the model fields do not list (an optimisation's target e-features, …),
  // kept where they name an entity
  const pickedIds = useMemo(() => {
    const listed = new Set(resolveWorkflowEntityRefs(schema, config).map((r) => r.id_str));
    const ids = settings.nodes.flatMap((n) =>
      entityIdsIn(n.entry ? get(config, [n.rootElement, n.entry]) : get(config, n.rootElement))
    );
    return [...new Set(ids)].filter((id) => !listed.has(id));
  }, [schema, config, settings]);
  const existing = useExistingEntityIds(pickedIds);
  const existingKey = [...existing].sort().join('|');

  // the inputs, several of a type as one card, each joined to the settings blocks that name it
  const { inputs, inputTargets } = useMemo(() => {
    const refs = resolveWorkflowEntityRefs(schema, config).map((ref) => ({
      id: ref.id_str,
      type: ref.type,
    }));
    const blockValues = settings.nodes.map((n) => ({
      id: n.id,
      value: n.entry ? get(config, [n.rootElement, n.entry]) : get(config, n.rootElement),
    }));
    const picked = pickedIds
      .filter((id) => existingKey.split('|').includes(id))
      .map((id) => ({ id, type: 'picked' }));
    const all = [...refs, ...picked];
    const groups = groupRefs(all.length ? all : entityId ? [{ id: entityId }] : []);
    const targets: Record<string, string[]> = {};
    const items: TSheetItem[] = groups.map((group) => {
      const id = `input:${group.key}`;
      targets[id] = blocksNaming(
        group.refs.map((r) => r.id),
        blockValues
      );
      const only = group.refs[0];
      return {
        id,
        content:
          group.refs.length === 1 && only ? (
            <EntityCard id={only.id} side="Input" />
          ) : (
            <EntityGroupCard refs={group.refs} typeLabel={refTypeLabel(group.type)} side="Input" />
          ),
      };
    });
    return { inputs: items, inputTargets: targets };
  }, [schema, config, entityId, settings, pickedIds, existingKey]);

  const rootColor = useMemo(() => {
    const roots = Object.keys(schema.properties ?? {});
    return (root: string) => PALETTE[Math.max(0, roots.indexOf(root)) % PALETTE.length];
  }, [schema]);

  const renderBlock = (block: BlockGraphNode) => {
    if (block.isDefault) return <DefaultCard block={block} />;
    const spec = schema.properties?.[block.rootElement];
    const kindLabel =
      (spec && 'singular_name' in spec && spec.singular_name) ||
      (spec && 'title' in spec ? spec.title : block.rootElement);
    const value = block.entry
      ? get(config, [block.rootElement, block.entry])
      : get(config, block.rootElement);
    // a dictionary's entry is described through its variant's schema; a single block through its own
    const fields = keyFields(
      block.entry
        ? describeBlock(block.rootElement, value, block.label, config, schema).fields
        : singleBlockFields(spec, value)
    );
    return (
      <BlockCard
        block={block}
        kindLabel={String(kindLabel)}
        color={rootColor(block.rootElement) ?? '#2563eb'}
        fields={fields}
        onOpen={() => onOpenBlock({ rootElement: block.rootElement, entry: block.entry })}
      />
    );
  };

  const name = get(config, 'info.campaign_name');
  const counts = new Map<ActivityStatus, number>();
  for (const { status } of sheet.rows) counts.set(status, (counts.get(status) ?? 0) + 1);
  const summary = [...counts.entries()];

  return (
    <div
      data-testid="campaign-overview"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-white"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="truncate text-lg font-bold text-primary-9">
            {typeof name === 'string' && name ? name : 'Campaign'}
          </h2>
          {summary.map(([status, n]) => (
            <span
              key={status}
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize text-white"
              style={{ backgroundColor: executionStatusColorMap[status] }}
            >
              {n} {STATUS_WORD[status]}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <DuplicateButton campaignId={campaignId} activity={activity} />
        </div>
      </header>
      <div className="relative min-h-0 flex-1">
        <PreviewContext.Provider value={setPreview}>
          <RunSheet
            inputs={inputs}
            inputTargets={inputTargets}
            settings={settings}
            renderBlock={renderBlock}
            runs={{ content: sheet.runs, height: sheet.runsHeight }}
            outputs={sheet.outputs}
            outputsReady={sheet.outputsReady}
          />
        </PreviewContext.Provider>
        {preview && <PreviewDrawer preview={preview} onClose={closePreview} />}
      </div>
      {footer}
    </div>
  );
}

/** A block's settings worth a glance: none that only say "Default", nor ids. */
function keyFields(fields: { label: string; value: string }[]) {
  return fields
    .filter(
      (f) =>
        f.value &&
        f.value !== 'Default' &&
        f.value.length <= 48 &&
        !/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(f.value)
    )
    .slice(0, 4);
}

/** A single block's settings, titled and in units from its own schema. */
function singleBlockFields(spec: unknown, value: unknown) {
  const props = (get(spec, 'properties') ?? {}) as Record<
    string,
    { title?: string; units?: string; ui_hidden?: boolean }
  >;
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, v]) => {
    const prop = props[key];
    if (key === 'type' || prop?.ui_hidden) return [];
    if (typeof v !== 'number' && typeof v !== 'string' && typeof v !== 'boolean') {
      if (!Array.isArray(v) || !v.every((x) => typeof x === 'number')) return [];
    }
    const text = Array.isArray(v) ? v.join(' / ') : String(v);
    return [
      {
        label: prop?.title ?? key.replaceAll('_', ' '),
        value: prop?.units ? `${text} ${prop.units}` : text,
      },
    ];
  });
}

function DuplicateButton({
  campaignId,
  activity,
}: {
  campaignId: string;
  activity: TScanConfigActivity;
}) {
  const router = useRouter();
  const flags = useFlags();
  const { virtualLabId, projectId } = useWorkspace();
  const { error: notifyError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      data-testid="overview-duplicate"
      title={`Open a copy of this ${activity} campaign to edit and run again`}
      onClick={() => {
        setLoading(true);
        resolveWorkflowConfigureHrefForEntity({
          entityId: campaignId,
          workspace: { virtualLabId, projectId },
          flags,
          mode: ScanConfigCampaignOriginActionDict.Duplicate,
        })
          .then((result) => {
            if (result.outcome === WorkflowConfigureOutcomeDict.Resolved) router.push(result.href);
            else notifyError({ message: 'Could not open a copy of this campaign' });
          })
          .catch(() => notifyError({ message: 'Could not open a copy of this campaign' }))
          .finally(() => setLoading(false));
      }}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary-8 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-7 disabled:opacity-60"
    >
      <RiFileCopyLine className="size-4" /> Duplicate &amp; edit
    </button>
  );
}

const KIND_COLOR = { stimulus: '#2563eb', recording: '#059669', manipulation: '#d97706' };

/** When each stimulus, recording and manipulation is on, over the run. */
function Timeline({
  schema,
  config,
  durationMs,
}: {
  schema: ConfigSchema;
  config: Config;
  durationMs: number | undefined;
}) {
  const events = useMemo(() => {
    const timed = configTimeline(undefined, config, schema);
    // recordings are timed by the generated SONATA config; from the form, each spans its window
    const recordings = get(config, 'recordings');
    if (recordings && typeof recordings === 'object') {
      for (const [name, block] of Object.entries(recordings as Record<string, unknown>)) {
        if (timed.some((e) => e.kind === 'recording' && e.name === name)) continue;
        const start = get(block, 'start_time');
        const end = get(block, 'end_time');
        timed.push({
          kind: 'recording',
          name,
          start: typeof start === 'number' ? start : 0,
          end: typeof end === 'number' ? end : undefined,
          block: describeBlock('recordings', block, 'Recording', config, schema),
        });
      }
    }
    return timed;
  }, [config, schema]);
  if (!durationMs || events.length === 0) return null;
  // one lane per block, its instants merged
  const lanes = [...new Map(events.map((e) => [`${e.kind}:${e.name}`, e])).keys()].map((key) =>
    events.filter((e) => `${e.kind}:${e.name}` === key)
  );
  const pct = (t: number) => Math.min(100, Math.max(0, (t / durationMs) * 100));
  const ticks = timeTicks(durationMs);
  const kinds = [...new Set(events.map((e) => e.kind))];
  // an open end runs to the end of the run
  const span = (e: { start: number; end?: number }) => {
    if (e.end === e.start) return `at ${round(e.start)} ms`;
    const end = e.end ?? durationMs;
    const whole = e.start === 0 && end >= durationMs;
    return `${round(e.start)}–${round(end)} ms${whole ? ' (whole run)' : ''}`;
  };
  return (
    <section
      className="border-t border-gray-100 px-5 pt-2 pb-3"
      data-testid="overview-timeline"
      aria-label="Timeline of the simulation"
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase text-gray-400">
          Timeline{' '}
          <span className="font-normal normal-case">
            · when each stimulus and recording is on, over the {round(durationMs)} ms run
          </span>
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          {kinds.map((kind) => (
            <span key={kind} className="inline-flex items-center gap-1 capitalize">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: KIND_COLOR[kind] }} />
              {kind}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[10rem_minmax(0,1fr)_9.5rem] items-center gap-x-3 gap-y-1">
        {lanes.map((lane) => {
          const first = lane[0];
          return (
            <div key={`${first.kind}:${first.name}`} className="contents">
              <span
                className="truncate text-xs font-medium text-gray-700"
                title={first.block.title}
              >
                {first.name}
              </span>
              <div className="relative h-3.5 rounded bg-gray-100">
                {ticks.map((t) => (
                  <span
                    key={t}
                    className="absolute top-0 h-full w-px bg-white"
                    style={{ left: `${pct(t)}%` }}
                  />
                ))}
                {lane.map((e) => (
                  <div
                    key={`${e.start}-${e.end}`}
                    className="absolute top-0 h-3.5 min-w-[3px] rounded"
                    title={`${first.block.title}: ${span(e)}`}
                    style={{
                      left: `${pct(e.start)}%`,
                      width: `${pct(e.end ?? durationMs) - pct(e.start)}%`,
                      backgroundColor: KIND_COLOR[e.kind],
                    }}
                  />
                ))}
              </div>
              <span className="truncate text-xs tabular-nums text-gray-500">
                {lane.length === 1 ? span(first) : `${lane.length} times`}
              </span>
            </div>
          );
        })}
        {/* the time axis, under the lanes */}
        <span />
        <div className="relative h-4 text-[10px] tabular-nums text-gray-400">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
              style={{ left: `${pct(t)}%` }}
            >
              {round(t)}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-gray-400">ms</span>
      </div>
    </section>
  );
}

const round = (v: number) => (Number.isInteger(v) ? `${v}` : `${Number(v.toPrecision(4))}`);

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}
