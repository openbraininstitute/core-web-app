'use client';

import { RiCheckLine, RiExternalLinkLine, RiFileCopyLine } from '@remixicon/react';
import { useAtomValue } from 'jotai';
import Link from 'next/link';
import { useMemo } from 'react';

import { ChevronRightStroke } from '@/components/icons';
import { collectWorkflowSessionRefs } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import { getEntityTypeTagLabel } from '@/features/scan-config/helpers';
import {
  workflowBreadcrumbEntitiesAtom,
  workflowBreadcrumbEntitiesFromSelection,
} from '@/features/scan-config/workflow/breadcrumb-entities';
import { findWorkflowDescriptorByDefinitionId } from '@/features/scan-config/workflow/components';
import { useScanConfigWorkflowOptional } from '@/features/scan-config/workflow/context';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/ui/molecules/breadcrumb/index';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { getActivity, getWorkflowEntityLabel } from '@/ui/segments/workflows/config';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { TWorkflowBreadcrumbEntity } from '@/features/scan-config/workflow/breadcrumb-entities';
import type { TWorkflowSessionSelectionPayload } from '@/features/scan-config/workflow/workflow-session-selection';
import type { WorkspaceContext } from '@/types/common';

/**
 * Names for the picked entities. Refs stored before names were recorded — or reached by
 * pasting the configure URL — carry ids only, so they are hydrated with the same resolver
 * the in-editor model selectors use (typed, batched per entity type).
 */
function useResolvedEntityNames(
  candidates: TWorkflowBreadcrumbEntity[],
  selection: TWorkflowSessionSelectionPayload | null | undefined,
  workspace: WorkspaceContext
) {
  const sessionRefs = useMemo(() => collectWorkflowSessionRefs(selection), [selection]);
  const needsLookup = candidates.some((candidate) => !candidate.name);

  const { entities } = useResolvedModelIdentifierEntities({
    refs: needsLookup ? sessionRefs : [],
    sessionRefs,
    context: workspace,
  });

  const namesById = new Map(entities.map((resolved) => [resolved.id, resolved.name]));

  return candidates.flatMap((candidate) => {
    const name = candidate.name ?? namesById.get(candidate.id);
    return name ? [{ key: candidate.key, id: candidate.id, type: candidate.type, name }] : [];
  });
}

/**
 * Trail for `/workflows/{activity}/configure/…`: the workflow, then what it was pointed at.
 * A multi-entity pick collapses to one crumb whose popover lists every name.
 */
export function ScanConfigWorkflowBreadcrumb({ className }: { className?: string }) {
  const context = useScanConfigWorkflowOptional();
  return context ? <Trail context={context} className={className} /> : null;
}

function Trail({
  context,
  className,
}: {
  context: NonNullable<ReturnType<typeof useScanConfigWorkflowOptional>>;
  className?: string;
}) {
  const { workspace, entity } = context;
  // live selection wins over the stored payload: the in-editor picker changes it without a nav
  const published = useAtomValue(workflowBreadcrumbEntitiesAtom);
  const stored = workflowBreadcrumbEntitiesFromSelection(entity.workflowSessionSelection);
  // last resort: the session resolved a primary id even when it carried no refs we could read
  const primary: TWorkflowBreadcrumbEntity[] = entity.entityId
    ? [{ key: entity.entityId, id: entity.entityId, type: entity.entityType, name: null }]
    : [];
  const candidates = published.length > 0 ? published : stored.length > 0 ? stored : primary;
  const selected = useResolvedEntityNames(candidates, entity.workflowSessionSelection, workspace);

  if (selected.length === 0) return null;

  return (
    <div className={cn('flex h-8 items-center', className)}>
      <div className="flex h-8 items-center rounded-full bg-[oklch(0.968_0.007_247.896)] px-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {selected.length === 1 ? (
                <span className="flex min-w-0 items-center gap-1">
                  <BreadcrumbPage
                    className="text-primary-9 max-w-80 truncate text-sm font-bold"
                    title={selected[0].name}
                  >
                    {selected[0].name}
                  </BreadcrumbPage>
                  <EntityActions size="sm" id={selected[0].id} name={selected[0].name} />
                </span>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="text-primary-9 hover:text-primary-7 text-sm font-bold underline decoration-dotted underline-offset-4 transition-colors"
                    >
                      Multiple entities ({selected.length})
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="bottom"
                    sideOffset={8}
                    // the trigger sits inside the chip's px-4, so nudge back out to
                    // finish flush with the chip's trailing edge
                    alignOffset={-14}
                    className="max-h-96 w-96 overflow-y-auto rounded-2xl border border-[oklch(0.968_0.007_247.896)] bg-white p-2 shadow-lg"
                  >
                    <ul className="flex flex-col gap-1">
                      {selected.map((item) => (
                        <li key={item.key}>
                          <EntityRow
                            id={item.id}
                            name={item.name}
                            typeLabel={getEntityTypeTagLabel(item.type)}
                          />
                        </li>
                      ))}
                    </ul>
                  </PopoverContent>
                </Popover>
              )}
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}

/**
 * Copy-id and open-entity, the two things you ever want from a named entity here.
 * `size` follows the surface: the breadcrumb chip is 32px tall, the popover rows are not.
 */
function EntityActions({
  id,
  name,
  size = 'md',
}: {
  id: string;
  name: string;
  size?: 'sm' | 'md';
}) {
  const [, copyId, , copied] = useCopyToClipboard();
  const button = cn(
    'text-primary-9 grid shrink-0 place-items-center rounded-full transition-colors hover:bg-white',
    size === 'sm' ? 'size-6' : 'size-8'
  );
  const glyph = size === 'sm' ? 'size-3.5' : 'size-4';

  return (
    <>
      <button
        type="button"
        onClick={() => copyId(id)}
        aria-label={`Copy ${name} ID`}
        title="Copy ID"
        className={button}
      >
        {copied ? (
          <RiCheckLine className={cn(glyph, 'text-green-600')} />
        ) : (
          <RiFileCopyLine className={glyph} />
        )}
      </button>

      <Link
        href={`/app/entity/${id}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${name}`}
        title="Open entity"
        className={button}
      >
        <RiExternalLinkLine className={glyph} />
      </Link>
    </>
  );
}

function EntityRow({ id, name, typeLabel }: { id: string; name: string; typeLabel: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-[oklch(0.968_0.007_247.896)]">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-[oklch(0.704_0.04_256.788)] uppercase">
          {typeLabel}
        </div>
        <div className="text-primary-9 truncate text-sm font-medium" title={name}>
          {name}
        </div>
      </div>

      <EntityActions id={id} name={name} />
    </div>
  );
}

/**
 * Workflow identity, centred on the panel's top edge: the activity, then the workflow's own
 * name. Resolved the way the workflows home page resolves it — `entity.entityType` is the
 * scan-config type, which flattens every circuit kind to "Circuit".
 */
export function ScanConfigWorkflowSummary({
  className,
  action,
}: {
  className?: string;
  action?: ReactNode;
}) {
  const context = useScanConfigWorkflowOptional();
  if (!context) return null;

  const { definition, entity } = context;
  const workflow = findWorkflowDescriptorByDefinitionId(definition.id);

  const activityLabel = getActivity(definition.activity)?.label;
  const typeLabel =
    workflow?.label ?? getWorkflowEntityLabel(workflow?.sourceType ?? entity.entityType);

  if (!activityLabel && !typeLabel) return null;

  return (
    <div className={cn('flex h-8 items-center', className)}>
      <div className="flex h-8 items-center gap-1 rounded-full bg-[oklch(0.968_0.007_247.896)] pr-2 pl-4">
        <Breadcrumb>
          <BreadcrumbList>
            {activityLabel ? (
              <BreadcrumbItem>
                <span className="text-primary-9 text-sm font-light">{activityLabel}</span>
              </BreadcrumbItem>
            ) : null}

            {activityLabel && typeLabel ? (
              <BreadcrumbSeparator className="text-primary-9 text-sm font-bold">
                <ChevronRightStroke className="size-3.5" />
              </BreadcrumbSeparator>
            ) : null}

            {typeLabel ? (
              <BreadcrumbItem>
                <BreadcrumbPage className="text-primary-9 max-w-96 truncate text-sm font-bold">
                  {typeLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>

        {action}
      </div>
    </div>
  );
}
