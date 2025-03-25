import { useSession } from 'next-auth/react';
import React from 'react';
import { serviceAiAgentThreadCreate } from '../api/thread';
import { logError } from '@/util/logger';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';

export function useServiceAiAgentThread(): [string | undefined, () => void] {
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const refCurrentThreadId = React.useRef<string | null>(null);
  const [threadId, setThreadId] = React.useState<string | undefined>(undefined);
  const session = useSession();
  const accessToken = session.data?.accessToken;
  const user = session.data?.user.username;
  const createThread = React.useCallback(() => {
    if (!accessToken) return;

    serviceAiAgentThreadCreate({
      accessToken,
      title: `${user} ${new Date().toISOString()}`,
      virtualLabId,
      projectId,
    })
      .then((data) => {
        setThreadId(data.threadId);
        refCurrentThreadId.current = data.threadId;
      })
      .catch(logError);
  }, [accessToken, user, virtualLabId, projectId]);
  React.useEffect(() => {
    if (!accessToken) return;

    createThread();
    return () => {
      const currentThreadId = refCurrentThreadId.current;
      if (!currentThreadId) return;

      refCurrentThreadId.current = null;
      /**
       * March 21th 2025
       * Jan asked to never delete the threads, so he can
       * "analyze what people ask and make the service better".
       */
      // serviceAiAgentThreadDelete({
      //   accessToken,
      //   threadId: currentThreadId,
      // });
    };
  }, [accessToken, createThread]);
  return [threadId, createThread];
}
