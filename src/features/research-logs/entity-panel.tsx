'use client';

import { useQuery } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useState } from 'react';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { useFlags } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';
import {
  resolveWorkflowConfigureHrefForEntity,
  WorkflowConfigureOutcomeDict,
} from '@/ui/segments/workflows/config/entity-entry';

import type { ReactNode } from 'react';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

type EntityPanel = {
  /** The entity whose mini detail view is open beside the log, if any. */
  record: EntityCoreObjectTypes | null;
  open: (record: EntityCoreObjectTypes) => void;
  close: () => void;
};

const EntityPanelContext = createContext<EntityPanel | null>(null);

/** Holds the open entity, shared by the log's cards and the layout that makes room for it. */
export function EntityPanelProvider({ children }: { children: ReactNode }) {
  const [record, setRecord] = useState<EntityCoreObjectTypes | null>(null);
  const close = useCallback(() => setRecord(null), []);
  return (
    <EntityPanelContext.Provider value={{ record, open: setRecord, close }}>
      {children}
    </EntityPanelContext.Provider>
  );
}

export const useEntityPanel = () => useContext(EntityPanelContext);

/**
 * Where a simulation campaign opens: its workflow, read-only. The editor loads the stored
 * campaign from `?origin=` and is only editable when asked to duplicate it.
 */
export function useCampaignWorkflowHref(id: string | undefined) {
  const flags = useFlags();
  const { virtualLabId, projectId } = useWorkspace();
  return useQuery({
    queryKey: ['research-log-campaign-workflow-href', id, virtualLabId, projectId],
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!id) return null;
      const result = await resolveWorkflowConfigureHrefForEntity({
        entityId: id,
        workspace: { virtualLabId, projectId },
        flags,
      });
      return result.outcome === WorkflowConfigureOutcomeDict.Resolved ? result.href : null;
    },
  });
}

/** A single-neuron circuit has its own listing type; every other entity is its own type. */
function dataTypeOf(record: EntityCoreObjectTypes): TExtendedEntitiesTypeDict {
  return record.type === EntityTypeDict.Circuit &&
    (record as ICircuit).scale === CircuitScaleDictionary.Single
    ? ExtendedEntitiesTypeDict.SingleNeuronCircuit
    : record.type;
}

/** The mini detail view of the open entity, as the Data page shows it. */
export function EntityPanelView() {
  const panel = useEntityPanel();
  const record = panel?.record ?? null;
  const campaignId = record?.type === EntityTypeDict.SimulationCampaign ? record.id : undefined;
  const { data: workflowHref } = useCampaignWorkflowHref(campaignId);

  if (!record) return null;
  return (
    <MiniDetailViewRenderer
      section={WorkspaceSection.Data}
      record={record}
      dataType={dataTypeOf(record)}
      onClose={panel?.close}
      detailsHref={workflowHref ?? undefined}
      // the log may hold unsaved edits, so details never replace it
      openDetailsInNewTab
    />
  );
}
