import { PlusOutlined } from '@ant-design/icons';
import sample from 'es-toolkit/compat/sample';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import {
  DefaultSynapseValue,
  SimulationColors,
  useBuildSingleNeuronSynaptomeSessionState,
} from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { getRandomIntInclusive } from '@/util/utils';
import { cn } from '@/utils/css-class';

import { resetColors } from '../colors';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';

export interface AddSynapticSetButtonProps {
  className?: string;
  sessionId: string;
}

export function AddSynapticSetButton({ className, sessionId }: AddSynapticSetButtonProps) {
  const breakpoint = useDefaultBreakpoint();
  const handleAdd = useAddHandler(sessionId);

  return (
    <Button
      rounded
      className={cn(
        className,
        'bg-neutral-1 hover:bg-neutral-2/20 hover:text-primary-9 mt-2 w-full flex-shrink-0 border'
      )}
      variant="outline"
      size={breakpoint === 'l' ? 'md' : 'lg'}
      onClick={handleAdd}
    >
      <div className="flex w-full items-center justify-between gap-4">
        <span>Add set</span>
        <PlusOutlined />
      </div>
    </Button>
  );
}

function useAddHandler(sessionId: string) {
  const { replace } = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const { sessionValue, setSessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });

  return () => {
    const id = crypto.randomUUID();
    const queryParams = new URLSearchParams(params);
    queryParams.set('set', id);
    const currentMap =
      sessionValue?.synapseSets ?? new Map<string, TSingleNeuronSynaptomeConfiguration>();
    const cloneMap = new Map<string, TSingleNeuronSynaptomeConfiguration>();
    // Cleanup the dictionary.
    for (const key of currentMap.keys()) {
      const val = currentMap.get(key);
      if (!val?.name || !val?.target) continue;

      cloneMap.set(key, val);
    }
    cloneMap?.set(id, {
      ...DefaultSynapseValue,
      id,
      seed: (sessionValue?.seed ?? 0) + getRandomIntInclusive(0, sessionValue?.seed ?? 0),
      color: sample(SimulationColors) ?? SimulationColors[cloneMap.size],
    });
    resetColors(cloneMap);
    setSessionValue({
      ...sessionValue,
      seed: sessionValue?.seed ?? 100,
      synapseSets: cloneMap,
    });
    replace(`${pathname}?${queryParams.toString()}`);
  };
}
