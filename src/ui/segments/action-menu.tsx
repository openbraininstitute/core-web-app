'use client';

import {
  CopyOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  DeleteOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useState, useCallback } from 'react';
import { useRouter , notFound } from 'next/navigation';
import NextLink from 'next/link';
import { useAtom } from 'jotai';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
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
  const { notification } = App.useApp();

  const entityType = getEntityByExtendedType({ type });
  if (!entityType) notFound();

  const handleCopyId = useCallback(async () => {
    if (copied) return;

    try {
      await navigator.clipboard.writeText(entity.id);
      setCopied(true);
      notification.success({
        message: 'ID Copied',
        description: 'The entity ID has been copied to your clipboard.',
        duration: 3,
        placement: 'bottomRight',
      });
      setTimeout(() => setCopied(false), 5000);
    } catch (err) {
      notification.error({
        message: 'Copy Failed',
        description: 'Could not copy to clipboard. Please copy the ID manually.',
        placement: 'bottomRight',
      });
      console.error('Failed to copy:', err);
    }
  }, [entity.id, copied, notification]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (type !== ExtendedEntitiesTypeDict.CellMorphology) {
        throw new Error(`Deletion not implemented for type ${type}`);
      }
      await deleteCellMorphology({ id: entity.id, context: ctx });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['experimental-data'], exact: false });
      await queryClient.invalidateQueries({ queryKey: ['experimental-data-count'], exact: false });

      notification.success({
        message: 'Deleted Successfully',
        description: 'The item has been deleted.',
        placement: 'bottomRight',
      });

      // Force a hard navigation → full page reload on the parent page
      window.location.href = parentLink;
    },
    onError: (error: Error) => {
      const errorMessage = error.message || 'Unknown error';
      notification.error({
        message: 'Deletion Failed',
        description: `Deletion failed! ${errorMessage}`,
        placement: 'bottomRight',
        duration: 5,
      });
    },
  });

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const confirmed = window.confirm(
        'Are you sure you want to delete this item? This action cannot be undone.'
      );

      if (confirmed) {
        deleteMutation.mutate();
      }
    },
    [deleteMutation]
  );

  const isSimulatable =
    typeof entityType.isSimulatable === 'boolean'
      ? entityType.isSimulatable
      : 'scale' in entity && entityType.isSimulatable(entity.scale);

  return (
    <div className="text-primary-9 mt-10 flex flex-col gap-5 px-5 text-base font-bold">
      <Action
        icon={
          !copied ? (
            <CopyOutlined onClick={handleCopyId} />
          ) : (
            <CheckOutlined className="text-teal-400" />
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
        <Action
          icon={
            <DeleteOutlined
              onClick={handleDeleteClick}
              style={{ color: deleteMutation.isPending ? '#999' : 'inherit' }}
            />
          }
        >
          {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        </Action>
      )}
    </div>
  );
}
