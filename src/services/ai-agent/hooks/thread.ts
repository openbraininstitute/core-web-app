import { useSession } from 'next-auth/react';
import React from 'react';
import { serviceAiAgentThreadCreate, serviceAiAgentThreadDelete } from '../api/thread';
import { logError } from '@/util/logger';

export function useServiceAiAgentThread() {
  const refCurrentThreadId = React.useRef<string | null>(null);
  const [threadId, setThreadId] = React.useState<string | undefined>(undefined);
  const session = useSession();
  const accessToken = session.data?.accessToken;
  const user = session.data?.user.username;
  React.useEffect(() => {
    if (!accessToken) return;

    serviceAiAgentThreadCreate({
      accessToken,
      title: `${user} ${new Date().toISOString()}`,
    })
      .then((data) => {
        setThreadId(data.threadId);
        refCurrentThreadId.current = data.threadId;
      })
      .catch(logError);
    return () => {
      const currentThreadId = refCurrentThreadId.current;
      if (!currentThreadId) return;

      refCurrentThreadId.current = null;
      serviceAiAgentThreadDelete({
        accessToken,
        threadId: currentThreadId,
      });
    };
  }, [accessToken, user]);
  return threadId;
}
