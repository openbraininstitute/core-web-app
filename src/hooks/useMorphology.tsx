import { useEffect, useRef, useState } from 'react';

import { getSingleNeuronMorphology } from '@/api/small-scale-simulator';
import { Morphology } from '@/services/bluenaas-single-cell/types';

export default function useMorphology({
  modelId,
  callback,
  projectId,
  virtualLabId,
}: {
  modelId: string;
  callback: (morphology: Morphology) => void;
  projectId: string;
  virtualLabId: string;
}) {
  const mountedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    async function start() {
      setError(null);
      if (mountedRef.current) {
        setLoading(true);
        try {
          const morphology = await getSingleNeuronMorphology({
            ctx: { virtualLabId, projectId },
            meModelId: modelId,
          });
          mountedRef.current = false;
          if (morphology) {
            callback(morphology);
          }
        } catch (err) {
          setError(`${err}`);
        } finally {
          setLoading(false);
        }
      }
    }

    start();

    return () => {
      mountedRef.current = false;
    };
  }, [callback, mountedRef, virtualLabId, projectId, modelId]);

  return { loading, error };
}
