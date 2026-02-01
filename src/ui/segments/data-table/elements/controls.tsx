'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Popconfirm } from 'antd';
import { compact, get } from 'es-toolkit/compat';
import { AnimatePresence, motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useMemo } from 'react';

import { deleteCellMorphology } from '@/api/entitycore/queries/experimental/cell-morphology';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import type { WorkspaceContext } from '@/types/common';
import { EntityDeleteButton } from '@/ui/segments/data-table/elements/delete-button';
import { EntityDownloadButton } from '@/ui/segments/data-table/elements/download-button';
import { useScrollNav } from '@/ui/segments/data-table/elements/hooks';
import type { RenderButtonProps } from '@/ui/segments/data-table/elements/use-row-selection';
import { cn } from '@/utils/css-class';

function RenderButton<T extends EntityCoreIdentifiable>({
  children,
  clearSelectedRows,
  selectedRows,
  dataType,
  workspace,
  allowDownload,
  allowDelete,
  onDelete,
  isDeleting,
}: RenderButtonProps<T> & {
  children?: (props: RenderButtonProps<T>) => ReactNode;
  workspace?: WorkspaceContext;
  allowDownload?: boolean;
  allowDelete?: boolean;
  onDelete: () => Promise<void>;
  isDeleting: boolean;
}) {
  if (children) {
    return children({ selectedRows, clearSelectedRows, dataType });
  }

  return (
    <div className="flex items-center gap-2">
      {allowDownload && (
        <EntityDownloadButton<T>
          selectedRows={selectedRows}
          dataType={dataType}
          clearSelectedRows={clearSelectedRows}
          workspace={workspace}
        />
      )}
      {allowDelete && (
        <Popconfirm
          title={<div className="font-bold text-lg text-primary-8">Delete entities</div>}
          description={
            <div>
              <div className="font-bold text-sm text-primary-8">
                Are you sure you want to delete {selectedRows.length} items?
              </div>
              <small className="font-light text-primary-6">This action cannot be undone.</small>
            </div>
          }
          onConfirm={onDelete}
          okText="Yes"
          cancelText="No"
          placement="bottomRight"
          disabled={isDeleting}
          classNames={{
            body: cn(
              'max-w-70',
              '[&_.ant-popconfirm-buttons_button]:rounded-full [&_.ant-popconfirm-buttons_button]:px-5',
              '[&_.ant-popconfirm-buttons_button:last-child]:bg-primary-8'
            ),
          }}
        >
          {/* Wrap in span to ensure Popconfirm triggers correctly on custom components */}
          <span className="inline-block">
            <EntityDeleteButton<T>
              selectedRows={selectedRows}
              dataType={dataType}
              clearSelectedRows={clearSelectedRows}
              workspace={workspace}
              loading={isDeleting}
              data-testid="listing-view-delete-button"
            />
          </span>
        </Popconfirm>
      )}
    </div>
  );
}

export default function TableControls<T extends EntityCoreIdentifiable>({
  clearSelectedRows,
  children,
  renderButton,
  selectedRows,
  visible,
  dataType,
  workspace,
}: {
  clearSelectedRows: RenderButtonProps<T>['clearSelectedRows'];
  children?: ReactNode;
  renderButton?: (props: RenderButtonProps<T>) => ReactNode;
  selectedRows: RenderButtonProps<T>['selectedRows'];
  visible: boolean;
  dataType: TExtendedEntitiesTypeDict;
  workspace?: WorkspaceContext;
}) {
  const { left, right } = useScrollNav('.ant-table-body');
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { notification } = App.useApp();
  const currentScope = searchParams.get('scope');

  useEffect(() => {
    if (clearSelectedRows) {
      clearSelectedRows();
    }
  }, [clearSelectedRows]);

  const permissions = useMemo(() => {
    const entityTypeConfig = getEntityByExtendedType({ type: dataType });
    const isProjectScope = currentScope === WorkspaceScope.Project;

    return {
      download: !!entityTypeConfig?.isDownloadable,
      delete: !!entityTypeConfig?.isDeletable && isProjectScope,
    };
  }, [dataType, currentScope]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!workspace) throw new Error('No workspace context found');

      const promises = selectedRows.map((row) => {
        if (dataType === ExtendedEntitiesTypeDict.CellMorphology) {
          return deleteCellMorphology({ id: row.id, context: workspace });
        }
        throw new Error(`Deletion logic not implemented for ${dataType}`);
      });

      return Promise.all(promises);
    },
    onSuccess: async () => {
      const dataKey = compact([
        workspace?.virtualLabId,
        workspace?.projectId,
        WorkspaceSection.Data,
        dataType,
        WorkspaceScope.Project,
      ]).join('/');

      await queryClient.invalidateQueries({
        predicate: (query) => get(query.queryKey[0], 'context.key') === dataKey,
      });

      // Refresh sidebar counts
      await queryClient.invalidateQueries({
        queryKey: [`data-entity-count-${dataType}`],
      });

      notification.success({
        message: 'Deleted successfully',
        description: `${selectedRows.length} items have been removed.`,
        placement: 'topRight',
      });

      if (clearSelectedRows) clearSelectedRows();
    },
    onError: (error: Error) => {
      notification.error({
        message: 'Deletion failed',
        description: error.message || 'An error occurred during bulk deletion.',
        placement: 'topRight',
      });
    },
  });

  if (!visible) return null;

  const hasSelection =
    !!selectedRows?.length &&
    Boolean(clearSelectedRows) &&
    (permissions.download || permissions.delete);

  return (
    <motion.div
      layout
      className="flex h-max shrink-0 items-center justify-between gap-5 px-1 pt-3"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <AnimatePresence mode="wait" key={`presence-${currentScope}`}>
        {hasSelection && (
          <motion.div
            key={`actions-wrapper-${currentScope}`}
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }}
          >
            <RenderButton<T>
              clearSelectedRows={clearSelectedRows}
              selectedRows={selectedRows}
              dataType={dataType}
              workspace={workspace}
              allowDownload={permissions.download}
              allowDelete={permissions.delete}
              onDelete={() => deleteMutation.mutateAsync()}
              isDeleting={deleteMutation.isPending}
            >
              {renderButton}
            </RenderButton>
          </motion.div>
        )}
      </AnimatePresence>
      {left}
      <div className="flex grow items-center">
        <div className="flex grow justify-center">{children}</div>
        <div className="ml-auto">{right}</div>
      </div>
    </motion.div>
  );
}
