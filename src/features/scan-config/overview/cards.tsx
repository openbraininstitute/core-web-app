'use client';

import { RiArrowRightUpLine, RiExternalLinkLine, RiShapesLine } from '@remixicon/react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { get } from 'es-toolkit/compat';
import Link from 'next/link';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { config as appConfig } from '@/config';
import { useFlags } from '@/features/feature-flags/provider';
import { resolveStrategyForRef } from '@/features/scan-config/outputs/registry';
import { PreviewThumbnail } from '@/features/thumbnail/preview';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { getWorkflowEntityLabel } from '@/ui/segments/workflows/config/helpers';
import { buildConfigureUrlForEntity } from '@/ui/segments/workflows/config/routes';
import { cn } from '@/utils/css-class';
import { resolveConcreteEntityPathParam } from '@/utils/url-builder';

import { nextStepsFor, workflowTypeOf } from './next-steps';
import { usePreview } from './preview-context';

import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { WorkspaceContext } from '@/types/common';
import type { BlockGraphNode } from './settings-graph';

type TEntityLike = {
  id: string;
  name?: string;
  type?: string | null;
  scale?: string | null;
  assets?: Array<{ label?: string | null }>;
};

/** `task_result` as "Task result". */
const humanize = (type: string) => {
  const words = type.replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** A card's top line: what it is, in its colour, and what sits at its right. */
export function CardLabel({
  children,
  color,
  right,
}: {
  children: ReactNode;
  color?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className="truncate text-[10px] font-bold uppercase tracking-wide"
        style={{ color: color ?? '#94a3b8' }}
      >
        {children}
      </span>
      {right}
    </div>
  );
}

type TResolved = { entity: TEntityLike; extendedType?: TExtendedEntitiesTypeDict };

/**
 * An entity through the results tabs' output resolver: its full record, from its own type's
 * route, and its extended type (a task result's kind, say an e-feature extraction result), which
 * decides where it opens. The query is the results tabs' own, so the two share the cache. Null
 * for what has no page of its own (an e-model's validation results).
 */
export function resolvedEntityQuery(
  context: WorkspaceContext,
  ref: { id: string; type?: string | null }
) {
  return {
    queryKey: ['scan-config-generated-output', context.virtualLabId, context.projectId, ref.id],
    queryFn: async (): Promise<TResolved | null> => {
      const found = await resolveStrategyForRef({ ref, context });
      if (!found) return null;
      const resolved = await found.strategy.resolve({ ref: found.ref, context });
      return resolved
        ? { entity: resolved.entity as unknown as TEntityLike, extendedType: resolved.extendedType }
        : null;
    },
    staleTime: 60_000,
    retry: false,
  };
}

/** The type an entity is known by in links and labels: a circuit by its scale, else its kind. */
export function linkTypeOf({ entity, extendedType }: TResolved) {
  return entity.type === EntityTypeDict.Circuit
    ? workflowTypeOf(entity)
    : (extendedType ?? workflowTypeOf(entity));
}

export function entityHref(context: WorkspaceContext, resolved: TResolved): string {
  return `${appConfig.ROOT_ROUTE}/${context.virtualLabId}/${context.projectId}/data/view/${resolveConcreteEntityPathParam(linkTypeOf(resolved))}/${resolved.entity.id}`;
}

/** Links to an entity's page open beside the overview, so it stays where it was. */
const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** A few facts that tell entities of a type apart, read from fields most entities carry. */
export function entityFacts(entity: TEntityLike): string[] {
  const facts: string[] = [];
  const count = (key: string, noun: string) => {
    const n = get(entity, key);
    if (typeof n === 'number') facts.push(`${n.toLocaleString()} ${noun}`);
  };
  count('number_neurons', 'neurons');
  count('number_synapses', 'synapses');
  count('number_connections', 'connections');
  const simulator = get(entity, 'target_simulator');
  if (typeof simulator === 'string') facts.push(simulator);
  const region = get(entity, 'brain_region.acronym') ?? get(entity, 'brain_region.name');
  if (typeof region === 'string') facts.push(region);
  for (const key of ['mtypes', 'etypes']) {
    const labels = (get(entity, key) as Array<{ pref_label?: string }> | undefined)
      ?.map((t) => t.pref_label)
      .filter(Boolean);
    if (labels?.length) facts.push(labels.join(', '));
  }
  return facts.slice(0, 4);
}

/** The entity's picture: a circuit's rendering, a model's trace, a morphology's drawing. */
function EntityPicture({ entity }: { entity: TEntityLike }) {
  const hasAsset = (label: AssetLabel) => entity.assets?.some((a) => a.label === label);
  const box = 'h-[110px] w-full rounded-md bg-gray-50 object-contain';
  if (entity.type === EntityTypeDict.Circuit) {
    const label = [AssetLabel.circuit_visualization, AssetLabel.simulation_designer_image].find(
      hasAsset
    );
    if (label) {
      return (
        <PreviewThumbnail
          entity={entity as never}
          target="assetLabel"
          label={label}
          className={box}
          height={110}
        />
      );
    }
  }
  if (
    entity.type === EntityTypeDict.Memodel ||
    entity.type === EntityTypeDict.Emodel ||
    entity.type === EntityTypeDict.CellMorphology
  ) {
    return <PreviewThumbnail entity={entity as never} className={box} height={110} />;
  }
  return (
    <div className={cn(box, 'flex items-center justify-center text-gray-300')}>
      <RiShapesLine className="size-10" />
    </div>
  );
}

/** An entity as a card: its picture, type, name (to its page), facts, and where it can go next. */
export function EntityCard({
  id,
  type,
  side,
  fallbackName,
  withNextSteps,
}: {
  id: string;
  /** The entity's type, where the ref knows it: one request saved. */
  type?: string | null;
  side: 'Input' | 'Output';
  fallbackName?: string | null;
  withNextSteps?: boolean;
}) {
  const context = useWorkspace();
  const preview = usePreview();
  const { data: resolved, isLoading } = useQuery(resolvedEntityQuery(context, { id, type }));

  if (!resolved) {
    return isLoading ? (
      <div className="m-3 h-full animate-pulse rounded-md bg-gray-100" />
    ) : (
      <div className="p-3 text-sm text-gray-500">{fallbackName ?? 'Not available'}</div>
    );
  }

  const { entity } = resolved;
  const linkType = linkTypeOf(resolved);
  const typeLabel = getWorkflowEntityLabel(linkType) ?? humanize(entity.type ?? 'entity');
  const name = entity.name ?? fallbackName;
  return (
    <div className="flex h-full flex-col gap-1.5 p-3">
      <CardLabel color={side === 'Input' ? '#0284c7' : '#059669'}>
        {side} · {typeLabel}
      </CardLabel>
      {preview ? (
        <button
          type="button"
          onClick={() => preview({ id, type })}
          className="rounded-md hover:ring-2 hover:ring-primary-3"
          aria-label={`Preview ${name ?? typeLabel}`}
        >
          <EntityPicture entity={entity} />
        </button>
      ) : (
        <EntityPicture entity={entity} />
      )}
      <EntityName
        name={name ?? `Unnamed ${typeLabel.toLowerCase()}`}
        href={entityHref(context, resolved)}
        onPreview={preview ? () => preview({ id, type }) : undefined}
        className="text-sm font-semibold"
      />
      <div className="truncate text-xs text-gray-500">{entityFacts(entity).join(' · ')}</div>
      {withNextSteps && <NextSteps entityId={entity.id} type={linkType} />}
    </div>
  );
}

/**
 * Where the entity can go next: each workflow that takes its type, from the workflow registry.
 * Links, so a click starts the workflow here and a ⌘/Ctrl-click opens it beside.
 */
function NextSteps({
  entityId,
  type,
}: {
  entityId: string;
  type: TExtendedEntitiesTypeDict | undefined;
}) {
  const flags = useFlags();
  const { virtualLabId, projectId } = useWorkspace();
  const steps = nextStepsFor(type, flags).slice(0, 2);
  if (steps.length === 0) return null;
  return (
    <div className="mt-auto flex flex-wrap gap-1.5">
      {steps.map((step) => {
        let href: string;
        try {
          href = buildConfigureUrlForEntity({
            activity: step.activity,
            targetType: step.targetType,
            workspace: { virtualLabId, projectId },
            entityId,
            entityType: type,
          });
        } catch {
          return null;
        }
        return (
          <Link
            key={`${step.activity}/${step.targetType}`}
            href={href}
            data-testid="overview-next-step"
            className="inline-flex items-center gap-1 rounded-full bg-primary-8 px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-7"
          >
            {step.label}
            {step.legacy && <span className="font-normal opacity-70">(legacy)</span>}
            <RiArrowRightUpLine className="size-3.5" />
          </Link>
        );
      })}
    </div>
  );
}

/** A settings block: its kind, name and first few settings; it opens its form. */
export function BlockCard({
  block,
  kindLabel,
  color,
  fields,
  onOpen,
}: {
  block: BlockGraphNode;
  kindLabel: string;
  color: string;
  fields: { label: string; value: string }[];
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full flex-col gap-1 border-l-4 p-3 text-left hover:bg-gray-50"
      style={{ borderLeftColor: color }}
      title={`Open ${block.label} in the configuration`}
      data-testid={`overview-block-${block.id}`}
    >
      <CardLabel color={color}>{kindLabel}</CardLabel>
      <div className="truncate text-sm font-semibold text-gray-800">{block.label}</div>
      {block.subtitle && <div className="truncate text-xs text-gray-500">{block.subtitle}</div>}
      <dl className="mt-0.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-xs">
        {fields.map((f) => (
          <div key={f.label} className="contents">
            <dt className="truncate text-gray-400">{f.label}</dt>
            <dd className="truncate font-medium text-gray-700" title={f.value}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
      {fields.length === 0 && <div className="text-xs text-gray-400">Open to see its settings</div>}
    </button>
  );
}

/** What an unset reference falls back to, said plainly. */
export function DefaultCard({ block }: { block: BlockGraphNode }) {
  return (
    <div className="flex h-full flex-col justify-center px-3">
      <CardLabel>Default</CardLabel>
      <div className="truncate text-sm text-gray-600">
        {block.label.replace(/^Default:\s*/, '')}
      </div>
    </div>
  );
}

/** Several entities of a type as one card: how many, and each by name to its page. */
export function EntityGroupCard({
  refs,
  typeLabel,
  side,
}: {
  refs: Array<{ id: string; name?: string | null }>;
  typeLabel: string;
  side: 'Input' | 'Output';
}) {
  const shown = refs.slice(0, 6);
  return (
    <div className="flex h-full flex-col gap-1.5 p-3">
      <CardLabel color={side === 'Input' ? '#0284c7' : '#059669'}>
        {side} · {refs.length} × {typeLabel.toLowerCase()}
      </CardLabel>
      <ul className="flex flex-col gap-1">
        {shown.map((ref) => (
          <li key={ref.id} className="min-w-0">
            <EntityNameLink id={ref.id} fallbackName={ref.name} />
          </li>
        ))}
      </ul>
      {refs.length > shown.length && (
        <div className="text-xs text-gray-500">and {refs.length - shown.length} more</div>
      )}
    </div>
  );
}

function EntityNameLink({ id, fallbackName }: { id: string; fallbackName?: string | null }) {
  const context = useWorkspace();
  const preview = usePreview();
  const { data: resolved, isLoading } = useQuery(resolvedEntityQuery(context, { id }));
  const name = resolved?.entity.name ?? fallbackName;
  if (!resolved) {
    return (
      <span className="block truncate text-sm text-gray-400">
        {name ?? (isLoading ? 'Loading…' : 'Not available')}
      </span>
    );
  }
  return (
    <EntityName
      name={name ?? 'Unnamed'}
      href={entityHref(context, resolved)}
      onPreview={preview ? () => preview({ id }) : undefined}
      className="text-sm font-medium"
    />
  );
}

/**
 * An entity's name: a click previews it beside the canvas (where there is a preview), the icon
 * opens its page in a new tab. Without a preview, the name is the new-tab link itself.
 */
function EntityName({
  name,
  href,
  onPreview,
  className,
}: {
  name: string;
  href: string;
  onPreview?: () => void;
  className?: string;
}) {
  if (!onPreview) {
    return (
      <Link
        href={href}
        {...NEW_TAB}
        className={cn(
          'group flex min-w-0 items-center gap-1 text-primary-8 hover:underline',
          className
        )}
        title={`${name} (opens in a new tab)`}
      >
        <span className="truncate">{name}</span>
        <RiExternalLinkLine className="size-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
      </Link>
    );
  }
  return (
    <span className={cn('flex min-w-0 items-center gap-1', className)}>
      <button
        type="button"
        onClick={onPreview}
        className="min-w-0 truncate text-left text-primary-8 hover:underline"
        title={`Preview ${name}`}
      >
        {name}
      </button>
      <Link
        href={href}
        {...NEW_TAB}
        aria-label={`Open ${name} in a new tab`}
        title="Open its page in a new tab"
        className="shrink-0 rounded p-0.5 text-primary-8 opacity-60 hover:bg-primary-0 hover:opacity-100"
      >
        <RiExternalLinkLine className="size-3.5" />
      </Link>
    </span>
  );
}

/** Of `ids`, those that name an entity with a page: an id-like value in a block need not be one. */
export function useExistingEntityIds(ids: string[]): Set<string> {
  const context = useWorkspace();
  const results = useQueries({ queries: ids.map((id) => resolvedEntityQuery(context, { id })) });
  return new Set(ids.filter((_, i) => results[i]?.data));
}
