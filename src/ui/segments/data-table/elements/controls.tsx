'use client';

import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect, useRef } from 'react';

import { useScope } from '@/ui/hooks/use-scope';
import { EntityDeleteButton } from '@/ui/segments/data-table/elements/delete-button';
import { EntityDownloadButton } from '@/ui/segments/data-table/elements/download-button';
import { useScrollNav } from '@/ui/segments/data-table/elements/hooks';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';
import type { RenderButtonProps } from '@/ui/segments/data-table/elements/use-row-selection';

function RenderButton<T extends EntityCoreIdentifiable>({
  children,
  clearSelectedRows,
  selectedRows,
  dataType,
  workspace,
  allowDownload,
  allowDelete,
}: RenderButtonProps<T> & {
  children?: (props: RenderButtonProps<T>) => ReactNode;
  workspace?: WorkspaceContext;
  allowDownload?: boolean;
  allowDelete?: boolean;
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
        <EntityDeleteButton<T>
          selectedRows={selectedRows}
          dataType={dataType}
          clearSelectedRows={clearSelectedRows}
          workspace={workspace}
        />
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
  allowDownload,
  allowDelete,
}: {
  clearSelectedRows: RenderButtonProps<T>['clearSelectedRows'];
  children?: ReactNode;
  renderButton?: (props: RenderButtonProps<T>) => ReactNode;
  selectedRows: RenderButtonProps<T>['selectedRows'];
  visible: boolean;
  dataType: TExtendedEntitiesTypeDict;
  workspace?: WorkspaceContext;
  // allow Download and Delete are two properties to define if the current table is able to use this two functionalities
  // and does not means that the entity is downloadable or deletable
  allowDownload?: boolean;
  allowDelete?: boolean;
}) {
  const { left, right } = useScrollNav('.ant-table-body');
  const { scope: currentScope } = useScope();
  const prevScopeRef = useRef(currentScope);

  useEffect(() => {
    if (prevScopeRef.current === currentScope) {
      return;
    }

    prevScopeRef.current = currentScope;
    clearSelectedRows?.();
  }, [clearSelectedRows, currentScope]);

  if (!visible) return null;

  const hasSelection = !!selectedRows?.length && Boolean(clearSelectedRows);

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
              allowDownload={allowDownload}
              allowDelete={allowDelete}
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
