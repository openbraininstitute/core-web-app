'use client';

import { Suspense } from 'react';

import DownloadPanel from '@/features/entities/circuit/elements/download-panel';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Summary from '@/features/details-view/summary';

import { DataType } from '@/constants/explore-section/list-views';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';
import { makeCustomRowSelectionEvent } from '@/components/explore-section/ExploreSectionListingView/expandable-row/custom-row-selection-event';

type Props = {
  // eslint-disable-next-line react/no-unused-prop-types
  params: WorkspaceContext & {
    id: string;
  };
  payload: ICircuit;
};
export default function DetailView({ payload }: Props) {
  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary
        dataType={DataType.Circuit}
        payload={payload}
        actions={{
          onDownload: () => makeCustomRowSelectionEvent({ record: payload }),
        }}
      />
      <DownloadPanel />
    </Suspense>
  );
}
