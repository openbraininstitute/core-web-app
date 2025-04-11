'use client';

import { ReactNode } from 'react';

import { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import { ExploreDownloadButton } from '@/components/explore-section/ExploreSectionListingView/DownloadButton';
import { useScrollNav } from '@/components/explore-section/ExploreSectionListingView/hooks';

export function DefaultRenderButton<T>({
  children,
  clearSelectedRows,
  selectedRows,
}: RenderButtonProps<T> & {
  children?: (props: RenderButtonProps<T>) => ReactNode;
}) {
  return children ? (
    children({ selectedRows, clearSelectedRows })
  ) : (
    <ExploreDownloadButton
      selectedRows={selectedRows}
      clearSelectedRows={clearSelectedRows}
      data-testid="listing-view-download-button"
    >
      <span>{`Download ${selectedRows.length === 1 ? 'Resource' : 'Resources'} (${
        selectedRows.length
      })`}</span>
    </ExploreDownloadButton>
  );
}

export default function TableControls<T>({
  clearSelectedRows,
  children,
  renderButton,
  selectedRows,
  visible,
}: {
  clearSelectedRows: RenderButtonProps<T>['clearSelectedRows'];
  children?: ReactNode;
  renderButton?: (props: RenderButtonProps<T>) => ReactNode;
  selectedRows: RenderButtonProps<T>['selectedRows'];
  visible: boolean;
}) {
  const { left, right } = useScrollNav(
    typeof document !== 'undefined'
      ? (document.querySelector('.ant-table-body') as HTMLDivElement)
      : undefined
  );

  if (!visible) return null;

  return (
    <div className="flex h-[100px] shrink-0 items-center justify-between gap-5 px-5">
      {left}
      <div className="flex grow items-center">
        <div className="flex grow justify-center">{children}</div>
        <div className="ml-auto">{right}</div>
      </div>
      {!!selectedRows?.length && clearSelectedRows && (
        <DefaultRenderButton clearSelectedRows={clearSelectedRows} selectedRows={selectedRows}>
          {renderButton}
        </DefaultRenderButton>
      )}
    </div>
  );
}
