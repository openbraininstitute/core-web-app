import { useCallback, useEffect, useRef, useState } from 'react';

import getMorphology from '@/api/bluenaas/get-morphology';
import { Morphology } from '@/services/bluenaas-single-cell/types';
import { isBluenaasError } from '@/types/simulation/single-neuron';
import { isJSON } from '@/util/utils';

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

  const readMorphology = useCallback(async (): Promise<Morphology | null> => {
    const response = await getMorphology({
      ctx: { virtualLabId, projectId },
      meModelId: modelId,
    });

    const reader = response.body?.getReader();
    let data: string = '';
    let value: Uint8Array | undefined;
    let done: boolean = false;
    const decoder = new TextDecoder();

    if (reader) {
      while (!done) {
        ({ done, value } = await reader.read());
        const decodedChunk = decoder.decode(value, { stream: true });
        data += decodedChunk;
        if (isJSON(data)) {
          const parsedJson = JSON.parse(data);
          if (isBluenaasError(parsedJson)) {
            throw new Error(parsedJson.details ?? 'Morphology generation failed.', {
              cause: 'BluenaasError',
            });
          }
          return parsedJson;
        }
      }
      return null;
    }
    throw new Error('Neuron morphology could not be constructed');
  }, [modelId, projectId, virtualLabId]);

  useEffect(() => {
    mountedRef.current = true;

    async function start() {
      setError(null);
      if (mountedRef.current) {
        setLoading(true);
        try {
          const morphology = await readMorphology();
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
  }, [callback, readMorphology, mountedRef]);

  return { loading, error };
}
