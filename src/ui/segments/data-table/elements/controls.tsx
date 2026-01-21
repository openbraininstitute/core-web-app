'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';
import { EntityDownloadButton } from '@/ui/segments/data-table/elements/download-button';
import { useScrollNav } from '@/ui/segments/data-table/elements/hooks';
import type { RenderButtonProps } from '@/ui/segments/data-table/elements/use-row-selection';

function RenderButton<T extends EntityCoreIdentifiable>({
  children,
  clearSelectedRows,
  selectedRows,
  dataType,
  workspace,
}: RenderButtonProps<T> & {
  children?: (props: RenderButtonProps<T>) => ReactNode;
  workspace?: WorkspaceContext;
}) {
  return children ? (
    children({ selectedRows, clearSelectedRows, dataType })
  ) : (
    <EntityDownloadButton<T>
      selectedRows={selectedRows}
      dataType={dataType}
      clearSelectedRows={clearSelectedRows}
      workspace={workspace}
      data-testid="listing-view-download-button"
    />
  );
}

export default function TableControls<T extends EntityCoreIdentifiable>({
  clearSelectedRows,
  children,
  renderButton,
  selectedRows,
  visible,
  dataType,
  allowDownload,
  workspace,
}: {
  clearSelectedRows: RenderButtonProps<T>['clearSelectedRows'];
  children?: ReactNode;
  renderButton?: (props: RenderButtonProps<T>) => ReactNode;
  selectedRows: RenderButtonProps<T>['selectedRows'];
  visible: boolean;
  dataType: TExtendedEntitiesTypeDict;
  allowDownload?: boolean;
  workspace?: WorkspaceContext;
}) {
  const { left, right } = useScrollNav('.ant-table-body');

  if (!visible) return null;

  const hasSelection = !!selectedRows?.length && Boolean(clearSelectedRows) && allowDownload;

  return (
    <motion.div
      layout
      className="flex h-max shrink-0 items-center justify-between gap-5 px-1 pt-3"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <AnimatePresence mode="wait">
        {hasSelection && (
          <motion.div
            key="download-button-wrapper"
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              mass: 0.8,
            }}
          >
            <RenderButton<T>
              clearSelectedRows={clearSelectedRows}
              selectedRows={selectedRows}
              dataType={dataType}
              workspace={workspace}
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
