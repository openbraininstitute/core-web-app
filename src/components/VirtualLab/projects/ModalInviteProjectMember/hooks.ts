import { useCallback, useState } from 'react';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';

import { Member } from './types';

import authFetch from '@/authFetch';
import { notification as notify } from '@/api/notifications';
import { virtualLabApi } from '@/config';
import { useUnwrappedValue } from '@/hooks/hooks';
import {
  virtualLabProjectDetailsAtomFamily,
  virtualLabProjectUsersAtomFamily,
} from '@/state/virtual-lab/projects';
import { VirtualLabMember } from '@/types/virtual-lab/members';
import { Project } from '@/types/virtual-lab/projects';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';
import { logError } from '@/util/logger';

/**
 *
 * @returns
 * * `null` if there is no current project in this context.
 * * `undefined` if there is no project with the current id.
 * * Otherwise, the details of the current project is returned.
 */
export function useCurrentProject(): Project | null | undefined {
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const data = virtualLabProjectDetailsAtomFamily({
    virtualLabId: virtualLabId ?? '',
    projectId: projectId ?? '',
  });
  const projectDetails = useUnwrappedValue(data);
  if (!virtualLabId || !projectId) return null;

  return projectDetails;
}

export function useCurrentProjectUsers(): VirtualLabMember[] {
  const virtualLabId = useParamVirtualLabId() ?? '';
  const projectId = useParamProjectId() ?? '';
  const users = useAtomValue(unwrap(virtualLabProjectUsersAtomFamily({ virtualLabId, projectId })));
  return users ?? [];
}

export function useInviteHandler(
  scope: 'project' | 'lab',
  members: Member[],
  onClose: () => void
): {
  loading: boolean;
  handleInvite: () => void;
} {
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const [loading, setLoading] = useState(false);
  const handleInvite = useCallback(() => {
    const action = async () => {
      setLoading(true);
      const url =
        scope === 'project'
          ? `${virtualLabApi.url}/virtual-labs/${virtualLabId}/projects/${projectId}/invites`
          : `${virtualLabApi.url}/virtual-labs/${virtualLabId}/invites`;
      try {
        for (const member of members) {
          const response = await authFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: member.email,
              role: member.role,
            }),
          });
          if (!response.ok) {
            notify.error(
              `Unable to invite "${member.email}"`,
              undefined,
              'topRight',
              undefined,
              `${virtualLabId}/${projectId}`
            );
            logError(await response.text());
          }
          notify.success(
            `Invitation sent to ${member.email}`,
            undefined,
            'topRight',
            undefined,
            `${virtualLabId}/${projectId}`
          );
        }
      } catch (ex) {
        notify.error(
          'An error prevented us from inviting new members!',
          undefined,
          'topRight',
          undefined,
          `${virtualLabId}/${projectId}`
        );
        logError(ex);
      } finally {
        setLoading(false);
      }
    };
    action().then(onClose).catch(onClose);
  }, [members, onClose, projectId, virtualLabId, scope]);
  return { loading, handleInvite };
}
