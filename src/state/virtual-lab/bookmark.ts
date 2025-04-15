import { atomFamily, atomWithRefresh } from 'jotai/utils';

import { VlmGetProjectBookmarksResponse } from '@/api/virtual-lab-svc/queries/types';
import { getAllBookmarksByCategory } from '@/api/virtual-lab-svc/queries/bookmark';
import { DataType } from '@/constants/explore-section/list-views';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { WorkspaceContext } from '@/types/common';

const isVirtualLabInfoAtomEqual = (a: VirtualLabInfo, b: VirtualLabInfo): boolean =>
  a.virtualLabId === b.virtualLabId && a.projectId === b.projectId;

export const bookmarksForProjectAtomFamily = atomFamily(
  ({ virtualLabId, projectId, category }: WorkspaceContext & { category?: DataType }) =>
    atomWithRefresh<Promise<VlmGetProjectBookmarksResponse>>(async (get) => {
      return await getAllBookmarksByCategory({ virtualLabId, projectId }, { category });
    }),
  isVirtualLabInfoAtomEqual
);
