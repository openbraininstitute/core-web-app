import { useEffect, useRef, useState } from 'react';
import { Session } from 'next-auth';

import NWBTrace from '../nwb-trace';
import { ensureArray } from '@/util/nexus';
import { Distribution } from '@/types/nexus';
import { fetchFileByUrl } from '@/api/nexus';

export default function useTrace(
  resource: any,
  session: Session | null
): [NWBTrace | null, Error | null] {
  const [nwbArrayBuffer, setNwbArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [trace, setTrace] = useState<NWBTrace | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const initialized = useRef<boolean>(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    const distr = ensureArray(resource.distribution).find(
      (distribution: Distribution) => distribution.encodingFormat === 'application/nwb'
    );

    fetchFileByUrl(distr.contentUrl, session)
      .then((res) => res.arrayBuffer())
      .then((arrayBuffer) => setNwbArrayBuffer(arrayBuffer))
      .catch((e) => setError(e));
  }, [session]);

  useEffect(() => {
    if (initialized.current || !nwbArrayBuffer) {
      return;
    }

    initialized.current = true;

    const id = resource['@id'].split('/').at(-1);
    const trace = new NWBTrace(id, nwbArrayBuffer);

    trace.ready.then(() => setTrace(trace)).catch((e) => setError(e));

    return () => {
      trace.destroy();
      initialized.current = false;
    };
  }, [nwbArrayBuffer]);

  return [trace, error];
}
