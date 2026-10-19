'use client';

import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { useObioneJsonSchema } from '@/features/scan-config/components/hooks/schema';
import { ScanConfigTopBarProvider } from '@/features/scan-config/components/top-bar/context';
import {
  collectWorkflowSessionRefs,
  resolveEntityFetchTarget,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import { getEntityTypeTagLabel } from '@/features/scan-config/helpers';
import {
  workflowBreadcrumbEntitiesAtom,
  workflowBreadcrumbEntitiesFromSelection,
} from '@/features/scan-config/workflow/breadcrumb-entities';
import { useScanConfigWorkflowOptional } from '@/features/scan-config/workflow/context';
import { findWorkflowDescriptorByDefinitionId } from '@/features/scan-config/workflow/find-descriptor';
import {
  collectEntityRefsFromConfig,
  resolveEntityRefsFromConfigForm,
} from '@/features/scan-config/workflow/workflow-schema-selection';
import { BreadcrumbChip, BreadcrumbTrail } from '@/ui/molecules/breadcrumb';
import {
  buildWorkflowHomeHref,
  getActivity,
  getWorkflowEntityLabel,
} from '@/ui/segments/workflows/config';
import { resolveScanConfigFromRegistry } from '@/ui/segments/workflows/config/scan-config-binding';

import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TFromIdRef } from '@/features/scan-config/helpers';
import type { TWorkflowBreadcrumbEntity } from '@/features/scan-config/workflow/breadcrumb-entities';
import type { TWorkflowSessionSelectionPayload } from '@/features/scan-config/workflow/workflow-session-selection';
import type { WorkspaceContext } from '@/types/common';
import type { BreadcrumbTrailItem } from '@/ui/molecules/breadcrumb';

/**
 * Names for the picked entities. Refs stored before names were recorded — or reached by
 * pasting the configure URL — carry ids only, so they are hydrated with the same resolver
 * the in-editor model selectors use (typed, batched per entity type).
 */
function useResolvedEntityNames(
  candidates: TWorkflowBreadcrumbEntity[],
  selection: TWorkflowSessionSelectionPayload | null | undefined,
  campaignRefs: TFromIdRef[],
  workspace: WorkspaceContext
) {
  const sessionRefs = useMemo(() => collectWorkflowSessionRefs(selection), [selection]);
  const needsLookup = candidates.some((candidate) => !candidate.name);
  const refs = useMemo(() => [...sessionRefs, ...campaignRefs], [sessionRefs, campaignRefs]);

  const { entities } = useResolvedModelIdentifierEntities({
    refs: needsLookup ? refs : [],
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
 * Which entities the crumb names, first non-empty source wins: the live editor/browse selection,
 * the session's stored selection, the entities in the origin campaign's saved form (activity,
 * duplicate and pasted URLs carry no session), then the session's primary id.
 */
export function pickBreadcrumbCandidates(sources: {
  published: TWorkflowBreadcrumbEntity[];
  stored: TWorkflowBreadcrumbEntity[];
  fromCampaign: TWorkflowBreadcrumbEntity[];
  primary: TWorkflowBreadcrumbEntity[];
}): TWorkflowBreadcrumbEntity[] {
  const { published, stored, fromCampaign, primary } = sources;
  return [published, stored, fromCampaign, primary].find((list) => list.length > 0) ?? [];
}

const copyOf = (entity: { id: string; name: string }) => ({
  value: entity.id,
  label: `Copy ${entity.name}`,
});

/**
 * Fills the scan-config top bar's start for `/workflows/{activity}/configure/…`: the breadcrumb
 * (activity › workflow › what it was pointed at). The picked entity carries its own copy button
 * (several: a dropdown with one per entity). The tabs take the end, inside the template.
 */
export function ScanConfigWorkflowTopBar({ children }: { children: ReactNode }) {
  const context = useScanConfigWorkflowOptional();
  return context ? (
    <WorkflowTopBarSlots context={context}>{children}</WorkflowTopBarSlots>
  ) : (
    children
  );
}

function WorkflowTopBarSlots({
  context,
  children,
}: {
  context: NonNullable<ReturnType<typeof useScanConfigWorkflowOptional>>;
  children: ReactNode;
}) {
  const { workspace, entity, definition, scanConfig, campaign } = context;
  // live selection wins over the stored payload: the in-editor picker changes it without a nav
  const published = useAtomValue(workflowBreadcrumbEntitiesAtom);
  const stored = workflowBreadcrumbEntitiesFromSelection(entity.workflowSessionSelection);
  // last resort: the session resolved a primary id even when it carried no refs we could read
  const primary: TWorkflowBreadcrumbEntity[] = entity.entityId
    ? [{ key: entity.entityId, id: entity.entityId, type: entity.entityType, name: null }]
    : [];
  // the origin campaign's saved form names its entities too; read it with the workflow's schema
  const { schema } = useObioneJsonSchema({
    schemaName: campaign.initialConfig
      ? resolveScanConfigFromRegistry(scanConfig).schemaName
      : undefined,
  });
  const campaignRefs = useMemo(() => {
    if (!schema) return [];
    const fromInitialize = resolveEntityRefsFromConfigForm(schema, campaign.initialConfig);
    // workflows that pick their entity outside `initialize` (ion channel models, …)
    return fromInitialize.length > 0
      ? fromInitialize
      : collectEntityRefsFromConfig(campaign.initialConfig);
  }, [schema, campaign.initialConfig]);
  const fromCampaign = useMemo(
    () =>
      campaignRefs.flatMap((ref) => {
        const target = resolveEntityFetchTarget(ref);
        return target
          ? [
              {
                key: `${target.entityType}:${target.id}`,
                ...target,
                type: target.entityType,
                name: null,
              },
            ]
          : [];
      }),
    [campaignRefs]
  );
  const candidates = pickBreadcrumbCandidates({ published, stored, fromCampaign, primary });
  const selected = useResolvedEntityNames(
    candidates,
    entity.workflowSessionSelection,
    campaignRefs,
    workspace
  );

  // resolved the way the workflows home page resolves it: `entity.entityType` is the
  // scan-config type, which flattens every circuit kind to "Circuit"
  const workflow = findWorkflowDescriptorByDefinitionId(definition.id);
  const activity = getActivity(definition.activity);
  const typeLabel =
    workflow?.label ?? getWorkflowEntityLabel(workflow?.sourceType ?? entity.entityType);
  const href = (targetType?: TExtendedEntitiesTypeDict) =>
    buildWorkflowHomeHref({ activity: activity?.value, targetType, workspace });

  const items: BreadcrumbTrailItem[] = [
    ...(activity ? [{ key: 'activity', label: activity.label, href: href() }] : []),
    ...(typeLabel
      ? [
          {
            key: 'type',
            label: typeLabel,
            href: href(workflow?.targetType),
            className: 'max-w-96 truncate',
          },
        ]
      : []),
    ...(selected.length > 0
      ? [
          {
            key: 'selection',
            label:
              selected.length === 1 ? selected[0].name : `Multiple entities (${selected.length})`,
            ...(selected.length === 1 ? { ellipsis: selected[0].name } : {}),
            ...(selected.length === 1
              ? { copy: copyOf(selected[0]) }
              : {
                  menu: selected.map((item) => ({
                    key: item.key,
                    label: item.name,
                    hint: getEntityTypeTagLabel(item.type),
                    copy: copyOf(item),
                  })),
                }),
          },
        ]
      : []),
  ];

  return (
    <ScanConfigTopBarProvider
      start={
        items.length > 0 ? (
          <BreadcrumbChip>
            <BreadcrumbTrail items={items} />
          </BreadcrumbChip>
        ) : undefined
      }
    >
      {children}
    </ScanConfigTopBarProvider>
  );
}
