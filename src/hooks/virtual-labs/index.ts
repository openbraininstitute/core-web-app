import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useAtomValue } from 'jotai';

import sessionAtom from '@/state/session';
import { virtualLabProjectUsersAtomFamily } from '@/state/virtual-lab/projects';
import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import { virtualLabMembersAtomFamily } from '@/state/virtual-lab/lab';
import { detailUrlBuilder } from '@/util/common';
import { useUnwrappedValue } from '@/hooks/hooks';

export function useExploreTableOnClickHandler<T extends EntityCoreIdentifiable>() {
  const router = useRouter();

  return useCallback(
    (basePath: string, record: T) => {
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

  const currentLabUser = virtualLabUsers.data?.users.find(
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

  const currentLabUser = virtualLabUsers.data?.users.find(
    (virtualLabUser) => virtualLabUser.id === session.user.id
  );

  if (!currentLabUser) {
    return false;
  }

  return currentLabUser.role === 'admin';
}
