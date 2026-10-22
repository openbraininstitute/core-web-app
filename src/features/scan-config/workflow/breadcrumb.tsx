'use client';

import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { useObioneJsonSchema } from '@/features/scan-config/components/hooks/schema';
import { ScanConfigTopBarProvider } from '@/features/scan-config/components/top-bar/context';
import { collectWorkflowSessionRefs } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import { useResolvedModelIdentifierEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/use-resolved-entities';
import { getEntityTypeTagLabel } from '@/features/scan-config/helpers';
import {
  workflowBreadcrumbEntitiesFromRefs,
  workflowBreadcrumbEntitiesFromSelection,
  workflowBreadcrumbRefsAtom,
} from '@/features/scan-config/workflow/breadcrumb-entities';
import { useScanConfigWorkflowOptional } from '@/features/scan-config/workflow/context';
import { findWorkflowDescriptorByDefinitionId } from '@/features/scan-config/workflow/find-descriptor';
import { resolveWorkflowEntityRefs } from '@/features/scan-config/workflow/workflow-schema-selection';
import { BreadcrumbChip, BreadcrumbTrail } from '@/ui/molecules/breadcrumb';
import { buildWorkflowCrumbs, getActivity } from '@/ui/segments/workflows/config';
import { resolveScanConfigFromRegistry } from '@/ui/segments/workflows/config/scan-config-binding';

import type { ReactNode } from 'react';
import type { TWorkflowBreadcrumbEntity } from '@/features/scan-config/workflow/breadcrumb-entities';
import type { TWorkflowSessionSelectionPayload } from '@/features/scan-config/workflow/workflow-session-selection';
import type { WorkspaceContext } from '@/types/common';
import type { BreadcrumbTrailItem } from '@/ui/molecules/breadcrumb';

/**
 * Names for the picked entities. Candidates without one (refs stored before names were
 * recorded, config refs, the primary id) are looked up by their own id and type, with the
 * session's browse type winning where it knows the id (same resolver as the model selectors).
 */
function useResolvedEntityNames(
  candidates: TWorkflowBreadcrumbEntity[],
  selection: TWorkflowSessionSelectionPayload | null | undefined,
  workspace: WorkspaceContext
) {
  const sessionRefs = useMemo(() => collectWorkflowSessionRefs(selection), [selection]);
  const unnamed = useMemo(
    () => candidates.flatMap(({ id, type, name }) => (name ? [] : [{ id, type }])),
    [candidates]
  );

  const { entities } = useResolvedModelIdentifierEntities({
    refs: unnamed,
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
 * Which entities the crumb names. The mounted editor's live config is authoritative, even when
 * empty (`null` = no editor). Without it, the first non-empty source wins: the session's stored
 * selection, the origin campaign's saved form (activity, duplicate and pasted URLs carry no
 * session), then the session's primary id.
 */
export function pickBreadcrumbCandidates(sources: {
  live: TWorkflowBreadcrumbEntity[] | null;
  stored: TWorkflowBreadcrumbEntity[];
  fromCampaign: TWorkflowBreadcrumbEntity[];
  primary: TWorkflowBreadcrumbEntity[];
}): TWorkflowBreadcrumbEntity[] {
  const { live, stored, fromCampaign, primary } = sources;
  return live ?? [stored, fromCampaign, primary].find((list) => list.length > 0) ?? [];
}

const copyOf = (entity: { id: string; name: string }) => ({
  value: entity.id,
  label: `Copy ${entity.name}`,
});

/**
 * Fills the scan-config top bar's start for `/workflows/{activity}/configure/…`: the breadcrumb
 * (activity › workflow › what it was pointed at). Several picked entities become a dropdown with
 * a copy button per entity. The tabs take the end, inside the template.
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
  const liveRefs = useAtomValue(workflowBreadcrumbRefsAtom);
  // the origin campaign's saved form names its entities too; read it with the workflow's schema
  const { schema } = useObioneJsonSchema({
    schemaName: campaign.initialConfig
      ? resolveScanConfigFromRegistry(scanConfig).schemaName
      : undefined,
  });

  const candidates = useMemo(
    () =>
      pickBreadcrumbCandidates({
        live: liveRefs && workflowBreadcrumbEntitiesFromRefs(liveRefs),
        stored: workflowBreadcrumbEntitiesFromSelection(entity.workflowSessionSelection),
        fromCampaign: schema
          ? workflowBreadcrumbEntitiesFromRefs(
              resolveWorkflowEntityRefs(schema, campaign.initialConfig)
            )
          : [],
        // last resort: the session resolved a primary id even when it carried no refs we could read
        primary: entity.entityId
          ? [{ key: entity.entityId, id: entity.entityId, type: entity.entityType, name: null }]
          : [],
      }),
    [
      liveRefs,
      entity.workflowSessionSelection,
      entity.entityId,
      entity.entityType,
      schema,
      campaign.initialConfig,
    ]
  );
  const selected = useResolvedEntityNames(candidates, entity.workflowSessionSelection, workspace);

  const items: BreadcrumbTrailItem[] = [
    // resolved the way the workflows home page resolves it: `entity.entityType` is the
    // scan-config type, which flattens every circuit kind to "Circuit"
    ...buildWorkflowCrumbs({
      activity: getActivity(definition.activity),
      workflow: findWorkflowDescriptorByDefinitionId(definition.id),
      workspace,
      fallbackType: entity.entityType,
    }),
    ...(selected.length > 0
      ? [
          {
            key: 'selection',
            label:
              selected.length === 1 ? selected[0].name : `Multiple entities (${selected.length})`,
            ...(selected.length === 1
              ? { ellipsis: selected[0].name }
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
