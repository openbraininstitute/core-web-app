import React from 'react';
import { useSession } from 'next-auth/react';

import { serviceAiAgentThreadList } from '../api/thread';

import { useParamProjectId, useParamVirtualLabId } from '@/util/params';
import { useAppNotification } from '@/components/notification';

export type AiAgentThreadList = AiAgentThreadListItem[];

export interface AiAgentThreadListItem {
  id: string;
  title: string;
  date: Date;
}

export function useServiceAiAgentThreadList(): AiAgentThreadList | undefined {
  const { error } = useAppNotification();
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const session = useSession();
  const accessToken = session.data?.accessToken;
  const [list, setList] = React.useState<AiAgentThreadList | undefined>(undefined);
  React.useEffect(() => {
    if (!accessToken) return;

    const action = async () => {
      try {
        console.log('Fetching history...');
        const resp = await serviceAiAgentThreadList({
          accessToken,
          projectId,
          virtualLabId,
        });
        console.log('🚀 [thread] resp =', resp); // @FIXME: Remove this line written on 2025-07-08 at 15:46
        setList(
          resp.results.map((result) => ({
            threadId: result.thread_id,
            title: result.title,
            date: new Date(result.update_date),
          }))
        );
      } catch (ex) {
        console.error('Unable to fetch history!', ex);
        error({ message: 'Unable to fetch history!' });
      }
    };
    action();
  }, [accessToken, virtualLabId, projectId, error]);
  return list;
}
