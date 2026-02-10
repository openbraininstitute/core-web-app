import { atomFamily, atomWithRefresh } from 'jotai/utils';
import isEqual from 'es-toolkit/compat/isEqual';

import { VlmGetProjectBookmarksResponse } from '@/api/virtual-lab-svc/queries/types';
import { getAllBookmarksByCategory } from '@/api/virtual-lab-svc/queries/bookmark';
import { WorkspaceContext } from '@/types/common';

import { getAllBookmarksByCategory } from '@/api/virtual-lab-svc/queries/bookmark';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { VlmGetProjectBookmarksResponse } from '@/api/virtual-lab-svc/queries/types';
import type { WorkspaceContext } from '@/types/common';

export const bookmarksForProjectAtomFamily = atomFamily(
  ({
    virtualLabId,
    projectId,
    category,
  }: WorkspaceContext & { category?: TExtendedEntitiesTypeDict }) => {
    const childAtom = atomWithRefresh<Promise<VlmGetProjectBookmarksResponse>>(async () => {
      return await getAllBookmarksByCategory({ virtualLabId, projectId }, { category });
    });
    childAtom.debugLabel = `bookmarks/${projectId}/${category ?? 'all'}`;
    return childAtom;
  },
  isEqual
);
