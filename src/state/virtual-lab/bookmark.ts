import { atomFamily, atomWithRefresh } from 'jotai/utils';
import isEqual from 'lodash/isEqual';

import { VlmGetProjectBookmarksResponse } from '@/api/virtual-lab-svc/queries/types';
import { getAllBookmarksByCategory } from '@/api/virtual-lab-svc/queries/bookmark';
import { DataType } from '@/constants/explore-section/list-views';
import { WorkspaceContext } from '@/types/common';

export const bookmarksForProjectAtomFamily = atomFamily(
  ({ virtualLabId, projectId, category }: WorkspaceContext & { category?: DataType }) => {
    const childAtom = atomWithRefresh<Promise<VlmGetProjectBookmarksResponse>>(async () => {
      return await getAllBookmarksByCategory({ virtualLabId, projectId }, { category });
    });
    childAtom.debugLabel = `bookmarks/${projectId}/${category ?? 'all'}`;
    return childAtom;
  },
  isEqual
);
