import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useAtomValue } from 'jotai';

import { detailUrlBuilder } from '@/util/common';
import { ExploreESHit } from '@/types/explore-section/es';
import { ExploreSectionResource } from '@/types/explore-section/resources';
import sessionAtom from '@/state/session';
import { virtualLabMembersAtomFamily } from '@/state/virtual-lab/lab';
import { useUnwrappedValue } from '@/hooks/hooks';
import { virtualLabProjectUsersAtomFamily } from '@/state/virtual-lab/projects';

export function useExploreTableOnClickHandler() {
  const router = useRouter();

  return useCallback(
    (basePath: string, record: ExploreESHit<ExploreSectionResource>) => {
      router.push(detailUrlBuilder(basePath, record));
    },
    [router]
  );
}

/**
 * Checks if the current user is an admin of the specified virtual lab.
 *
 * @param {object} params - The parameters object.
 * @param {string} params.virtualLabId - The ID of the virtual lab to check.
 * @returns {boolean} - `true` if the current user is an admin of the virtual lab, `false` otherwise.
 */
export function useIsVirtualLabAdmin({ virtualLabId }: { virtualLabId: string }) {
  const session = useAtomValue(sessionAtom);
  const virtualLabUsers = useUnwrappedValue(virtualLabMembersAtomFamily(virtualLabId));

  if (!session || !virtualLabUsers) {
    return false;
  }

  const currentLabUser = virtualLabUsers.find(
    (virtualLabUser) => virtualLabUser.id === session.user.id
  );

  if (!currentLabUser) {
    return false;
  }

  return currentLabUser.role === 'admin';
}

/**
 * Checks if the current user is an admin of the specified virtual lab project.
 *
 * @param {object} params - The parameters object.
 * @param {string} params.virtualLabId - The ID of the virtual lab to check.
 * @param {string} params.projectId - The ID of the project to check.
 * @returns {boolean} - `true` if the current user is an admin of the virtual lab project, `false` otherwise.
 */
export function useIsProjectAdmin({
  virtualLabId,
  projectId,
}: {
  virtualLabId: string;
  projectId: string;
}) {
  const session = useAtomValue(sessionAtom);
  const virtualLabUsers = useUnwrappedValue(
    virtualLabProjectUsersAtomFamily({ virtualLabId, projectId })
  );

  if (!session || !virtualLabUsers) {
    return false;
  }

  const currentLabUser = virtualLabUsers.find(
    (virtualLabUser) => virtualLabUser.id === session.user.id
  );

  if (!currentLabUser) {
    return false;
  }

  return currentLabUser.role === 'admin';
}
