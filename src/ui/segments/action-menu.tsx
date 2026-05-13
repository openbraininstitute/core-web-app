'use client';

import {
  CheckOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Popconfirm } from 'antd';
import { compact, get } from 'es-toolkit/compat';
import { useAtom } from 'jotai';
import NextLink from 'next/link';
import { notFound, useRouter } from 'next/navigation';

import { deleteCellMorphology } from '@/api/entitycore/queries/experimental/cell-morphology';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { downloadArchive } from '@/services/entity-download';
import Action from '@/ui/molecules/side-menu-action';
import { downloadPanelCircuitAtom } from '@/ui/segments/explore/circuit/elements/download-panel';
import {
  PanelQueryParam,
  WorkflowSimulatePanels,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { cn } from '@/utils/css-class';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { EntityTypeValue } from '@/entity-configuration/domain';
import type { WorkspaceContext } from '@/types/common';

export default function ActionMenu({
  entity,
  ctx,
  type,
  parentLink,
  isPublicEntity,
}: {
  entity: EntityTypeValue;
  ctx: WorkspaceContext;
  type: TExtendedEntitiesTypeDict;
  parentLink: string;
  isPublicEntity: boolean;
}) {
  const { replace: navigate } = useRouter();
  const queryClient = useQueryClient();
  const [, setCircuit] = useAtom(downloadPanelCircuitAtom);
  const { error: notifyError, success: notifySuccess } = useAppNotification();
  const entityType = getEntityByExtendedType({ type });
  if (!entityType) notFound();

  const [, copy, , copying] = useCopyToClipboard({
    onSuccess: () => {
      notifySuccess({
        message: 'ID Copied',
        description: 'The entity ID has been copied to your clipboard.',
        duration: 3,
        placement: 'topRight',
      });
    },
    onError: () => {
      notifyError({
        message: 'Copy Failed',
        description: 'Could not copy to clipboard. Please copy the ID manually.',
        placement: 'topRight',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (type !== ExtendedEntitiesTypeDict.CellMorphology) {
        throw new Error(`Deletion not implemented for type ${type}`);
      }
      await deleteCellMorphology({ id: entity.id, context: ctx });
    },
    onSuccess: async () => {
      const dataKey = compact([
        ctx.virtualLabId,
        ctx.projectId,
        WorkspaceSection.Data,
        type,
        WorkspaceScope.Project,
      ]).join('/');
      await queryClient.invalidateQueries({
        predicate(query) {
          const key = get(query.queryKey[0], 'context.key');
          if (key === dataKey) return true;
          return false;
        },
      });
      await queryClient.invalidateQueries({
        predicate(query) {
          const identifierKey = query.queryKey[0];
          const key = `data-entity-count-${type}`;
          return identifierKey === key;
        },
      });
      notifySuccess({
        message: 'Deleted successfully',
        description: 'The item has been successfully deleted.',
        placement: 'topRight',
      });
      navigate(parentLink);
    },
    onError: (error: Error) => {
      const errorMessage = get(error.cause, 'message') || 'Unknown error';
      let description = errorMessage;
      if (errorMessage.toLowerCase().includes('foreign keys integrity violation')) {
        description = 'This entity is referenced by another record and cannot be deleted.';
      }
      notifyError({
        message: 'Deletion failed',
        description,
        placement: 'topRight',
        duration: 5,
      });
    },
  });

  const isAnatomicalCircuit =
    entityType.type === EntityTypeDict.Circuit &&
    (entity as ICircuit).has_electrical_cell_models === false;

  const isSimulatable =
    (typeof entityType.isSimulatable === 'boolean'
      ? entityType.isSimulatable
      : 'scale' in entity && entityType.isSimulatable(entity.scale)) && !isAnatomicalCircuit;

  return (
    <div className="text-primary-9 mt-10 flex flex-col gap-5 px-5 text-base font-bold">
      <Action
        icon={
          !copying ? (
            <CopyOutlined onClick={() => copy(entity.id)} className="text-primary-8" />
          ) : (
            <CheckOutlined className="text-teal-400" />
          )
        }
      >
        {copying ? 'Copied' : 'Copy ID'}
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
              <ExperimentOutlined className="text-primary-8" />
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
              className="text-primary-8"
              onClick={() => {
                if (entity.type === ExtendedEntitiesTypeDict.Circuit)
                  setCircuit(entity as ICircuit);
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

      {entityType.isDeletable && !isPublicEntity && (
        <Popconfirm
          autoAdjustOverflow
          destroyOnHidden
          placement="bottomRight"
          title={<div className="font-bold text-lg text-primary-8">Delete the entity</div>}
          description={
            <div>
              <div className="font-bold text-sm text-primary-8">
                Are you sure you want to delete this item?
              </div>
              <small className="font-light text-primary-6">This action cannot be undone.</small>
            </div>
          }
          okText="Yes"
          cancelText="No"
          arrow={{ pointAtCenter: false }}
          onConfirm={() => deleteMutation.mutateAsync()}
          classNames={{
            body: cn(
              'max-w-70',
              '[&_.ant-popconfirm-buttons_button]:px-4',
              '[&_.ant-popconfirm-buttons_button]:rounded-full [&_.ant-popconfirm-buttons_button]:px-5',
              '[&_.ant-popconfirm-buttons_button:first-child]',
              '[&_.ant-popconfirm-buttons_button:last-child]:bg-primary-8'
            ),
          }}
        >
          <span className="cursor-pointer">
            <Action icon={deleteMutation.isPending ? <LoadingOutlined /> : <DeleteOutlined />}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Action>
          </span>
        </Popconfirm>
      )}
    </div>
  );
}
