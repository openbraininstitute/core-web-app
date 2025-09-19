'use client';

import { ReactNode } from 'react';

import { ExploreDownloadButton } from '@/ui/segments/data-table/elements/download-button';
import { useScrollNav } from '@/ui/segments/data-table/elements/hooks';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { RenderButtonProps } from '@/ui/segments/data-table/elements/use-row-selection';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

function DefaultRenderButton<T extends EntityCoreIdentifiable>({
  children,
  clearSelectedRows,
  selectedRows,
  dataType,
}: RenderButtonProps<T> & {
  children?: (props: RenderButtonProps<T>) => ReactNode;
}) {
  return children ? (
    children({ selectedRows, clearSelectedRows, dataType })
  ) : (
    <ExploreDownloadButton<T>
      selectedRows={selectedRows}
      dataType={dataType}
      clearSelectedRows={clearSelectedRows}
      data-testid="listing-view-download-button"
    >
      <span>{`Download ${selectedRows.length === 1 ? 'Resource' : 'Resources'} (${
        selectedRows.length
      })`}</span>
    </ExploreDownloadButton>
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
}: {
  clearSelectedRows: RenderButtonProps<T>['clearSelectedRows'];
  children?: ReactNode;
  renderButton?: (props: RenderButtonProps<T>) => ReactNode;
  selectedRows: RenderButtonProps<T>['selectedRows'];
  visible: boolean;
  dataType: TExtendedEntitiesTypeDict;
  allowDownload?: boolean;
}) {
  const { left, right } = useScrollNav(
    typeof document !== 'undefined'
      ? (document.querySelector('.ant-table-body') as HTMLDivElement)
      : undefined
  );

  if (!visible) return null;

  return (
    <div className="flex h-max shrink-0 items-center justify-between gap-5 px-1 pt-3">
      {left}
      <div className="flex grow items-center">
        <div className="flex grow justify-center">{children}</div>
        <div className="ml-auto">{right}</div>
      </div>
      {!!selectedRows?.length && clearSelectedRows && allowDownload && (
        <DefaultRenderButton<T>
          clearSelectedRows={clearSelectedRows}
          selectedRows={selectedRows}
          dataType={dataType}
        >
          {renderButton}
        </DefaultRenderButton>
      )}
    </div>
  );
}
