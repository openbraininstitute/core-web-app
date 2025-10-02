'use client';

import { DeleteOutlined, EyeInvisibleOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import sample from 'lodash/sample';
import { useAtom } from 'jotai';
import { Color } from 'three';

import { SingleNeuronSynaptomeBaseSchema } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { createBubblesInstanced } from '@/services/bluenaas-single-cell/renderer-utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import {
  DefaultColor,
  DefaultSynapseValue,
  SimulationColors,
  useBuildSingleNeuronSynaptomeSessionState,
} from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { synapsesPlacementAtom } from '@/state/synaptome';
import { formatCompactNumber } from '@/utils/format';
import { getRandomIntInclusive } from '@/util/utils';
import { Button } from '@/ui/molecules/button';
import {
  sendRemoveSynapses3DEvent,
  sendDisplaySynapses3DEvent,
} from '@/components/neuron-viewer/hooks/events';
import { cn } from '@/utils/css-class';

type Props = { sessionId: string };

export function SynapseSetMenuItems({ sessionId }: Props) {
  const params = useSearchParams();
  const pathname = usePathname();
  const breakpoint = useDefaultBreakpoint();
  const { replace } = useRouter();
  const [synapsesPlacement, setSynapsesPlacementAtom] = useAtom(synapsesPlacementAtom);
  const { sessionValue, setSessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });

  const currentSet = params.get('set');

  const onAdd = () => {
    const id = crypto.randomUUID();
    const queryParams = new URLSearchParams(params);
    queryParams.set('set', id);
    const cloneMap = new Map(sessionValue?.synapseSets);

    cloneMap?.set(id, {
      ...DefaultSynapseValue,
      id,
      seed: (sessionValue?.seed ?? 0) + getRandomIntInclusive(0, sessionValue?.seed ?? 0),
      color: sample(SimulationColors) ?? SimulationColors[cloneMap.size],
    });

    setSessionValue({
      ...sessionValue,
      seed: sessionValue?.seed ?? 100,
      synapseSets: cloneMap,
    });

    replace(`${pathname}?${queryParams.toString()}`);
  };

  const onSelectSet = (id: string) => {
    const queryParams = new URLSearchParams(params);
    queryParams.set('set', id);
    replace(`${pathname}?${queryParams.toString()}`);
  };

  const onDeleteSet = (id: string) => {
    const cloneMap = new Map(sessionValue?.synapseSets);
    const cloneCountMap = new Map(sessionValue?.synapseCount);
    cloneMap.delete(id);
    cloneCountMap.delete(id);

    if (cloneMap.size === 0) {
      const newId = crypto.randomUUID();
      const queryParams = new URLSearchParams(params);
      queryParams.set('set', newId);
      const newMap = new Map();
      newMap.set(newId, {
        ...DefaultSynapseValue,
        id: newId,
        seed: (sessionValue?.seed ?? 0) + getRandomIntInclusive(0, sessionValue?.seed ?? 0),
        color: sample(SimulationColors) ?? SimulationColors.at(0) ?? DefaultColor,
      });
      setSessionValue({
        ...sessionValue,
        seed: sessionValue?.seed ?? 100,
        synapseSets: newMap,
        synapseCount: new Map(),
      });
      replace(`${pathname}?${queryParams.toString()}`);
      return;
    }

    setSessionValue({
      ...sessionValue,
      seed: sessionValue?.seed ?? 100,
      synapseSets: cloneMap,
      synapseCount: cloneCountMap,
    });

    const currentSynapsesPlacementConfig = synapsesPlacement?.[id];
    if (currentSynapsesPlacementConfig?.meshId) {
      sendRemoveSynapses3DEvent(id, currentSynapsesPlacementConfig.meshId);
      setSynapsesPlacementAtom({
        ...synapsesPlacement,
        [id]: {
          ...currentSynapsesPlacementConfig,
          meshId: undefined,
        },
      });
    }
    if (currentSet === id) {
      const queryParams = new URLSearchParams(params);
      queryParams.delete('set');
      replace(`${pathname}?${queryParams.toString()}`);
    }
  };

  const onToggleVisibility = (id: string) => {
    const currentSynapsesPlacementConfig = synapsesPlacement?.[id];
    const synapseSet = sessionValue?.synapseSets?.get(id);

    if (currentSynapsesPlacementConfig?.meshId) {
      sendRemoveSynapses3DEvent(id, currentSynapsesPlacementConfig.meshId);
      setSynapsesPlacementAtom({
        ...synapsesPlacement,
        [id]: {
          ...currentSynapsesPlacementConfig,
          meshId: undefined,
        },
      });
    } else if (currentSynapsesPlacementConfig?.sectionSynapses && synapseSet) {
      const synapsePositions = currentSynapsesPlacementConfig.sectionSynapses
        .flat()
        .flatMap((p) => p.synapses)
        .map((o) => o.coordinates);

      const mesh = createBubblesInstanced(synapsePositions, new Color(synapseSet.color));
      sendDisplaySynapses3DEvent(id, mesh);

      setSynapsesPlacementAtom({
        ...synapsesPlacement,
        [id]: {
          ...currentSynapsesPlacementConfig,
          meshId: mesh.uuid,
        },
      });
    }
  };

  return (
    <div className="flex max-h-[300px] flex-col gap-1.5">
      <div className="secondary-scrollbar flex-1 overflow-y-auto pr-1">
        {Array.from(sessionValue?.synapseSets?.values() ?? [])
          ?.filter((o) => SingleNeuronSynaptomeBaseSchema.safeParse(o).success)
          .map((o) => {
            const isVisible = !!synapsesPlacement?.[o.id]?.meshId;
            const canShow = !!synapsesPlacement?.[o.id]?.sectionSynapses;
            const count = sessionValue?.synapseCount?.get(o.id);
            return (
              <div
                key={o.id}
                className="group relative mb-1 flex h-max w-full items-center gap-0 overflow-hidden"
              >
                <Button
                  rounded
                  variant="ghost"
                  className={cn(
                    'bg-neutral-1 border-neutral-2/60 hover:bg-neutral-2/20 hover:text-primary-9 active:bg-primary-7 w-full cursor-pointer border transition-all duration-300 ease-out',
                    { 'bg-neutral-2/40 text-primary-9 border-neutral-3': currentSet === o.id },
                    'group-hover:w-[calc(100%-80px)]'
                  )}
                  size={breakpoint === 'l' ? 'md' : 'lg'}
                  active={currentSet === o.id}
                  onClick={() => onSelectSet(o.id)}
                >
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="line-clamp-1 truncate">{o.name}</span>
                    <div className="flex items-center justify-center gap-1">
                      {count && (
                        <span className="text-xs">
                          <strong>{formatCompactNumber(count)}</strong> synapses
                        </span>
                      )}
                      {isVisible && (
                        <div
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ background: o.color }}
                          title="Synaptome visible"
                        />
                      )}
                    </div>
                  </div>
                </Button>

                <div
                  className={cn(
                    'absolute right-0 flex items-center gap-1.5',
                    'translate-x-full opacity-0',
                    'group-hover:translate-x-0 group-hover:opacity-100',
                    'transition-all duration-300 ease-out'
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="mt-auto w-full">
                        <Button
                          rounded
                          variant="outline"
                          className={cn(
                            'border-neutral-2 hover:text-white',
                            'h-10 w-10 bg-transparent p-0',
                            'rounded-r-none border-r-0',
                            'transition-all duration-200 ease-out',
                            'shadow-md',
                            { 'h-8 w-8': breakpoint === 'l' },
                            { 'h-10 w-10': breakpoint === 'xl' },
                            // eslint-disable-next-line no-nested-ternary
                            isVisible
                              ? 'hover:border-orange-500 hover:bg-orange-500'
                              : canShow
                                ? 'hover:border-secondary-4 hover:bg-secondary-3'
                                : 'opacity-50 hover:border-gray-400 hover:bg-gray-400'
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(o.id);
                          }}
                          title={
                            // eslint-disable-next-line no-nested-ternary
                            isVisible
                              ? 'Hide synaptome'
                              : canShow
                                ? 'Show synaptome'
                                : 'Apply changes first to generate synaptome'
                          }
                          disabled={!isVisible && !canShow}
                        >
                          {isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {!isVisible && !canShow && (
                      <TooltipContent
                        sideOffset={10}
                        className="text-primary-9 bg-white"
                        arrowClassName="bg-white"
                      >
                        <p className={cn('text-justify text-base')}>Please apply changes again</p>
                      </TooltipContent>
                    )}
                  </Tooltip>

                  <Button
                    variant="outline"
                    rounded
                    className={cn(
                      'border-neutral-2 hover:border-red-500 hover:bg-red-500',
                      'h-10 w-10 bg-transparent p-0 hover:text-white',
                      'rounded-l-none',
                      'transition-all duration-200 ease-out',
                      'shadow-md',
                      { 'h-8 w-8': breakpoint === 'l' },
                      { 'h-10 w-10': breakpoint === 'xl' }
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSet(o.id);
                    }}
                    title="Delete synapse set"
                  >
                    <DeleteOutlined />
                  </Button>
                </div>
              </div>
            );
          })}
      </div>

      <Button
        rounded
        className="bg-neutral-1 hover:bg-neutral-2/20 hover:text-primary-9 mt-2 w-full flex-shrink-0 border"
        variant="outline"
        size={breakpoint === 'l' ? 'md' : 'lg'}
        onClick={onAdd}
      >
        <div className="flex w-full items-center justify-between gap-4">
          <span>Add set</span>
          <PlusOutlined />
        </div>
      </Button>
    </div>
  );
}
