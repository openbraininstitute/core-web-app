'use client';

import { useRouter } from '@bprogress/next';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useFlags } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { APO } from '@/ui/segments/project/hex-home/hex-geometry';
import { HexTile } from '@/ui/segments/project/hex-home/hex-tile';
import { columnSpecs, layTongues } from '@/ui/segments/project/hex-home/tongue-geometry';
import {
  listActivities,
  listWorkflows,
  WorkflowListContextDict,
  WorkflowListSortDict,
} from '@/ui/segments/workflows/config';
import { buildConfigureUrlForEntity } from '@/ui/segments/workflows/config/routes';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { cn } from '@/utils/css-class';

import { WORKFLOW_EXAMPLES } from './workflow-examples';
import { PREVIEW_ASPECT, PREVIEW_CHROME_H, WorkflowPreview, workflowDescription } from './workflow-preview';

import type { IWorkflowExample } from './workflow-examples';

import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config';

/** Laid out this many px across and scaled to the page, as the home is. */
const STAGE_W = 1600;
/** The types' hexagons on a tongue. */
const TYPE_R = 84;
/** The column's left margin, in stage px, as columnSpecs lays it out. */
const EDGE = 18;
/** The headings, in page px: "Start a new workflow" over the categories, "Project workflows" over the table. */
const HEAD_H = 32;
const HEAD_GAP = 12;
export const HEADING = 'text-primary-9 m-0 text-[22px] leading-[32px] font-bold whitespace-nowrap';
/** The two groups, each a panel of its own with its heading inside, this far in (page px) and this far apart. */
const PAD = 16;
const GROUP_GAP = 16;
export const PANEL = 'rounded-3xl border border-neutral-2 bg-white';

/** Where an example starts its workflow, its entity already chosen; none for a workflow that cannot open on one. */
export function exampleConfigureUrl(opts: {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  workspace: { virtualLabId: string; projectId: string };
  example: IWorkflowExample;
}): string | null {
  try {
    return buildConfigureUrlForEntity({
      activity: opts.activity,
      targetType: opts.targetType,
      workspace: opts.workspace,
      entityId: opts.example.id,
      entityType: opts.example.entityType,
      query: { [PanelQueryParam]: WorkflowSimulatePanels.Configuration },
    });
  } catch {
    return null;
  }
}

/**
 * The workflows' categories as the home's: hexagons straight down the left under "Start a new workflow", each with a
 * tongue of its workflow types folded into it that comes out to the right while it is hovered (or clicked out, for a
 * touch screen), over the page, which dims meanwhile. A type clicked starts its workflow at its entity selection;
 * one hovered shows its preview beside its tongue, which stays while the pointer moves onto it: a green button
 * starts a new workflow of that type, and its examples start one with their entity already chosen. `children` (the
 * activity table) fills the room right of the column, under "Project workflows".
 */
export function WorkflowHexMenu({
  onSelectType,
  onPrepareType,
  children,
}: {
  onSelectType: (activity: TActivityValue, type: TExtendedEntitiesTypeDict) => void;
  /** A type hovered, which may well be started next: the time to fetch what starting it needs. */
  onPrepareType?: (activity: TActivityValue, type: TExtendedEntitiesTypeDict) => void;
  children: ReactNode;
}) {
  const flags = useFlags();
  const { virtualLabId, projectId } = useWorkspace();
  const router = useRouter();
  const host = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // the stage's scale, its height under the headings (stage px), and the first heading's width (page px)
  const [size, setSize] = useState<{ scale: number; height: number; headW: number } | null>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => {
      const scale = el.clientWidth / STAGE_W;
      if (!scale) return;
      const height = Math.floor((el.clientHeight - PAD - HEAD_H - HEAD_GAP) / scale / 10) * 10;
      const headW = Math.ceil(heading.current?.offsetWidth ?? 0);
      setSize((was) =>
        was && was.scale === scale && was.height === height && was.headW === headW ? was : { scale, height, headW }
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // the heading again once its font has loaded
    if (heading.current) observer.observe(heading.current);
    return () => observer.disconnect();
  }, []);

  const activities = listActivities(flags);
  // only what can be started now: no greyed out types, and none a newer workflow has superseded
  const types = activities.map((a) =>
    listWorkflows({
      activity: a.value as TActivityValue,
      flags,
      context: WorkflowListContextDict.Configure,
      sort: WorkflowListSortDict.Order,
    }).filter((type) => !type.disabled && !type.legacy && type.targetType)
  );
  const height = size?.height ?? 0;
  const scale = size?.scale ?? 1;
  const counts = types.map((t) => t.length);
  // the column centred under its heading, where that is the wider
  const headW = (size?.headW ?? 0) / scale;
  const specs = useMemo(() => {
    if (!height) return [];
    const laid = columnSpecs(STAGE_W, height, counts);
    const colW = 2 * laid[0].root.r * APO;
    const dx = Math.max(0, (headW - colW) / 2);
    return laid.map((sp) => ({ ...sp, root: { ...sp.root, x: sp.root.x + dx } }));
  }, [height, counts.join(), headW]);
  const tongues = useMemo(
    () =>
      specs.length
        ? layTongues({ specs, width: STAGE_W, height, apart: true, along: 2, itemR: TYPE_R, across: 3 })
        : [],
    [specs, height]
  );

  // the tongue out: hovered, with a moment's grace between a category and its types, or clicked out
  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const leaving = useRef<number | undefined>(undefined);
  const onTongue = (t: number) => (on: boolean) => {
    window.clearTimeout(leaving.current);
    if (on) setHovered(t);
    else leaving.current = window.setTimeout(() => setHovered((h) => (h === t ? null : h)), 260);
  };
  useEffect(() => () => window.clearTimeout(leaving.current), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPinned(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const out = hovered ?? pinned;

  // The type hovered, whose preview shows beside its tongue; the last one shown is kept while the preview fades out.
  // The first is shown at once, another of the same tongue only once the pointer rests on it, so crossing tiles on
  // the way to the preview does not change it; and the pointer on the preview keeps it, with a moment's grace on
  // the way there.
  const [hoverType, setHoverType] = useState<{ t: number; i: number } | null>(null);
  const [lastType, setLastType] = useState<{ t: number; i: number } | null>(null);
  const typeTimer = useRef<number | undefined>(undefined);
  const show = (at: { t: number; i: number }) => {
    setHoverType(at);
    setLastType(at);
  };
  const onType = (t: number, i: number) => (on: boolean) => {
    onTongue(t)(on);
    if (on) onPrepareType?.(activities[t].value as TActivityValue, types[t][i].targetType!);
    window.clearTimeout(typeTimer.current);
    if (!on) typeTimer.current = window.setTimeout(() => setHoverType(null), 350);
    else if (!hoverType || hoverType.t !== t) show({ t, i });
    else if (hoverType.i !== i) typeTimer.current = window.setTimeout(() => show({ t, i }), 180);
  };
  const onPreview = (on: boolean) => {
    if (!lastType) return;
    onTongue(lastType.t)(on);
    window.clearTimeout(typeTimer.current);
    if (on) setHoverType(lastType);
    else typeTimer.current = window.setTimeout(() => setHoverType(null), 350);
  };
  useEffect(() => () => window.clearTimeout(typeTimer.current), []);
  const previewOn = !!hoverType && out === hoverType.t;

  // the left side's right edge: the column's, or its heading's where that is wider
  const columnRight = specs.length
    ? Math.max(EDGE + headW, ...specs.map((sp) => sp.root.x + sp.root.r * APO))
    : 0;

  // the preview sits right of its tongue's widest tile, as large as the room there allows, centred on the stage
  const preview = (() => {
    const at = lastType;
    if (!at || !tongues[at.t]?.length) return null;
    const type = types[at.t][at.i];
    if (!type) return null;
    const tongueRight = Math.max(...tongues[at.t].map((tile) => tile.x + tile.r * APO));
    const x = Math.min(tongueRight + 44, STAGE_W - 32 - 520);
    const w = Math.max(460, Math.min(STAGE_W - 32 - x - 32, (height - 40 - PREVIEW_CHROME_H) * PREVIEW_ASPECT));
    const total = w / PREVIEW_ASPECT + 32 + PREVIEW_CHROME_H;
    return {
      key: `${at.t}-${at.i}`,
      activity: activities[at.t].label,
      title: type.label,
      description: workflowDescription(
        type.targetType!,
        type.description ?? type.entity.description,
        activities[at.t].label,
        type.label
      ),
      at: { x, y: Math.max(20, (height - total) / 2), w },
      activityValue: activities[at.t].value as TActivityValue,
      targetType: type.targetType!,
    };
  })();

  // a few public entities to start the type on show from
  const examples = (preview && WORKFLOW_EXAMPLES[preview.targetType]) || [];
  const startFrom = (example: IWorkflowExample) => {
    if (!preview) return;
    const url = exampleConfigureUrl({
      activity: preview.activityValue,
      targetType: preview.targetType,
      workspace: { virtualLabId, projectId },
      example,
    });
    // a workflow that cannot open on an entity: its own start, where the entity is picked
    if (url) router.push(url);
    else onSelectType(preview.activityValue, preview.targetType);
  };

  return (
    <div
      ref={host}
      className="relative h-full w-full overflow-hidden"
      // a click off the tiles and the preview puts a clicked-out tongue away
      onPointerDown={(e) => {
        if (pinned !== null && !(e.target as Element).closest('[data-hex-stage]')) setPinned(null);
      }}
    >
      <h2 ref={heading} className={cn(HEADING, 'absolute z-[1]')} style={{ top: PAD, left: EDGE * scale }}>
        Start a new workflow
      </h2>
      {size && (
        <>
          {/* the two groups: starting a workflow on the left, the project's own on the right */}
          <div
            className={cn(PANEL, 'absolute top-0 bottom-0 left-0')}
            style={{ width: (columnRight + EDGE) * scale }}
          />
          <div
            className={cn(PANEL, 'absolute top-0 right-0 bottom-0 flex flex-col transition-opacity duration-300')}
            style={{
              left: (columnRight + EDGE) * scale + GROUP_GAP,
              padding: PAD,
              opacity: out === null ? 1 : 0.15,
            }}
          >
            <h2 className={cn(HEADING, 'shrink-0')} style={{ marginBottom: HEAD_GAP }}>
              Project workflows
            </h2>
            <div className="min-h-0 flex-1">{children}</div>
          </div>
          <div
            data-hex-stage
            className="pointer-events-none absolute left-0 origin-top-left"
            style={{ top: PAD + HEAD_H + HEAD_GAP, width: STAGE_W, height, transform: `scale(${scale})` }}
          >
            {tongues.map((tiles, t) =>
              tiles.map((tile) => {
                const type = types[t][tile.item!];
                const folded = out !== t;
                const live = !type.disabled && type.targetType;
                const on = previewOn && hoverType!.t === t && hoverType!.i === tile.item;
                return (
                  <HexTile
                    key={tile.key}
                    box={tile}
                    drift={tile.drift}
                    lift={on ? 1.1 : tile.lift}
                    tone={on ? 'navy' : 'white'}
                    className="pointer-events-auto"
                    onClick={live ? () => onSelectType(activities[t].value as TActivityValue, type.targetType!) : undefined}
                    onHover={onType(t, tile.item!)}
                    title={type.disabled ? `${type.label}: not available` : type.label}
                    folded={folded}
                    foldTo={specs[t].root}
                    foldDelayMs={Math.round(folded ? 0 : 60 + tile.s * 0.3)}
                  >
                    <div
                      className={cn(
                        'flex h-full w-full flex-col items-center justify-center gap-[4px] px-[18px] text-center',
                        !live && 'opacity-45'
                      )}
                    >
                      <span
                        className={cn(
                          'text-[17px] leading-[20px] font-black tracking-[0.02em] transition-colors duration-300',
                          on ? 'text-white' : 'text-primary-9'
                        )}
                      >
                        {type.label}
                      </span>
                    </div>
                  </HexTile>
                );
              })
            )}
            {specs.map((sp, i) => {
              const on = out === i;
              const activity = activities[i];
              return (
                <HexTile
                  key={activity.value}
                  box={sp.root}
                  lift={on ? 1.1 : 0.9}
                  drift={false}
                  tone={on ? 'navy' : 'white'}
                  className="pointer-events-auto"
                  onClick={() => setPinned((p) => (p === i ? null : i))}
                  onHover={onTongue(i)}
                  title={activity.label}
                  appearMs={120 + i * 70}
                >
                  <div className="flex h-full w-full items-center justify-center px-[6px] text-center">
                    <span
                      className={cn(
                        'text-[17px] leading-[19px] font-bold tracking-[0.04em] uppercase transition-colors duration-300',
                        on ? 'text-white' : 'text-primary-9'
                      )}
                    >
                      {activity.label}
                    </span>
                  </div>
                </HexTile>
              );
            })}
            {preview && (
              <WorkflowPreview
                id={preview.key}
                activity={preview.activity}
                title={preview.title}
                description={preview.description}
                at={preview.at}
                shown={previewOn}
                examples={examples}
                onStartNew={() => onSelectType(preview.activityValue, preview.targetType)}
                onExample={startFrom}
                onHover={onPreview}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
