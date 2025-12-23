'use client';

import {
  CopyOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useState, useCallback } from 'react';
import { notFound } from 'next/navigation';
import NextLink from 'next/link';
import { useAtom } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { config } from '@/config';
import { downloadPanelCircuitAtom } from '@/ui/segments/explore/circuit/elements/download-panel';
import { EntityTypeValue } from '@/entity-configuration/domain';
import { downloadArchive } from '@/services/entity-download';
import Action from '@/ui/molecules/side-menu-action';
import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { deleteCellMorphology } from '@/api/entitycore/queries/experimental/cell-morphology';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

export default function ActionMenu({
  entity,
  ctx,
  type,
  parentLink,
}: {
  entity: EntityTypeValue;
  ctx: WorkspaceContext;
  type: EntityCoreExtendedType;
  parentLink: string;
}) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [, setCircuit] = useAtom(downloadPanelCircuitAtom);

  const entityType = getEntityByExtendedType({ type });
  if (!entityType) notFound();

  const handleDelete = useCallback(async () => {
    try {
      if (type === ExtendedEntitiesTypeDict.CellMorphology) {
        // 1. Perform the API Call
        await deleteCellMorphology({ id: entity.id, context: ctx });

        // 2. Clear all React Query caches aggressively
        await queryClient.resetQueries({
          queryKey: ['experimental-data'],
          exact: false,
        });
        await queryClient.resetQueries({
          queryKey: ['experimental-data-count'],
          exact: false,
        });

        // 3. THE "NUCLEAR" FIX:
        // Instead of router.push (which is a soft navigation),
        // we use window.location.assign to force a hard browser reload.
        window.location.assign(parentLink);
      } else {
        throw new Error(`Deletion not implemented for type ${type}`);
      }
    } catch (error) {
      const errorMessage = `Deletion failed! ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      alert(errorMessage);
    }
  }, [entity.id, type, ctx, parentLink, queryClient]);

  const isSimulatable =
    typeof entityType.isSimulatable === 'boolean'
      ? entityType.isSimulatable
      : 'scale' in entity && entityType.isSimulatable(entity.scale);

  return (
    <div className="text-primary-9 mt-10 flex flex-col gap-5 px-5 text-base font-bold">
      <Action
        icon={
          !copied ? (
            <CopyOutlined
              onClick={() => {
                if (copied) return;
                setCopied(true);
                const tempInput = document.createElement('input');
                tempInput.value = entity.id;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                window.setTimeout(() => setCopied(false), 5000);
              }}
            />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em">
              <title>check</title>
              <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" fill="#3e0" />
            </svg>
          )
        }
      >
        {copied ? 'Copied' : 'Copy ID'}
      </Action>

      {isSimulatable && (
        <Action
          icon={
            <NextLink
              href={{
                pathname: `${config.ROOT_ROUTE}/${ctx.virtualLabId}/${ctx.projectId}/workflows/simulate/configure/${entityType.type.replaceAll('_', '-')}/${entity.id}`,
                query: {
                  sessionId: crypto.randomUUID(),
                  [PanelQueryParam]: WorkflowSimulatePanels.Configuration,
                },
              }}
            >
              <ExperimentOutlined />
            </NextLink>
          }
        >
          Simulate
        </Action>
      )}

      {entityType.isDownloadable && (
        <Action
          icon={
            <DownloadOutlined
              onClick={() => {
                if (entity.type === 'circuit') setCircuit(entity as ICircuit);
                else {
                  downloadArchive(entityType.type, [entity.id], ctx);
                }
              }}
            />
          }
        >
          Download
        </Action>
      )}

      {entityType.isDeletable && (
        <Action icon={<DeleteOutlined onClick={handleDelete} />}>Delete</Action>
      )}
    </div>
  );
}
