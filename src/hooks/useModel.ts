import { useEffect, useRef, useState } from 'react';

import { useAppNotification } from '@/components/notification';
import { fetchResourceById } from '@/api/nexus';
import { getSession } from '@/authFetch';
import { nexus } from '@/config';

export function useModel<T>({
  modelId,
  org,
  project,
  callback,
}: {
  modelId?: string | null;
  org?: string;
  project?: string;
  callback?: (value: T) => void;
}) {
  const [resource, setResource] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  const { error: notifyError } = useAppNotification();
  const callbackRef = useRef(callback);

  useEffect(() => {
    let isAborted = false;
    if (!modelId) return;

    (async () => {
      try {
        setLoading(true);
        const session = await getSession();
        if (!session) throw new Error('no session');

        const resourceObject = await fetchResourceById<T>(
          modelId,
          session,
          modelId.startsWith(nexus.defaultIdBaseUrl)
            ? {}
            : {
                org,
                project,
              }
        );

        if (!isAborted) {
          setResource(resourceObject);
          callbackRef.current?.(resourceObject);
        }
      } catch (error) {
        notifyError({ message: 'Error while loading the resource details', placement: 'topRight' });
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      isAborted = true;
    };
  }, [modelId, notifyError, org, project]);

  return { resource, loading };
}
