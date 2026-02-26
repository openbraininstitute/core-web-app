'use client';

import { DeleteOutlined, EyeInvisibleOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import sample from 'es-toolkit/compat/sample';
import { useAtom } from 'jotai';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import {
  SingleNeuronSynaptomeBaseSchema,
  type TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import {
  DefaultSynapseValue,
  SimulationColors,
  useBuildSingleNeuronSynaptomeSessionState,
} from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { SynapsesPlacementAtomFamily } from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { getColorFromGeneratedPalette } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/webgl-neuron-selector/colors';
import { useVisibleSynapsesSetter } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/webgl-neuron-selector/hooks';
import { getRandomIntInclusive } from '@/util/utils';
import { cn } from '@/utils/css-class';
import { formatCompactNumber } from '@/utils/format';

import type { SectionSynapsesFor3D } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';

type Props = { sessionId: string };

export function SynapseSetMenuItems({ sessionId }: Props) {
  const params = useSearchParams();
  const pathname = usePathname();
  const breakpoint = useDefaultBreakpoint();
  const { replace } = useRouter();
  const [synapsesPlacement, setSynapsesPlacement] = useAtom(SynapsesPlacementAtomFamily(sessionId));
  const { sessionValue, setSessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });

  const currentSet = params.get('set');

  const onAdd = () => {
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
      });
      setSessionValue({
        ...sessionValue,
        seed: sessionValue?.seed ?? 100,
        synapseSets: resetColors(newMap),
        synapseCount: new Map(),
      });
      replace(`${pathname}?${queryParams.toString()}`);
      return;
    }

    setSessionValue({
      ...sessionValue,
      seed: sessionValue?.seed ?? 100,
      synapseSets: resetColors(cloneMap),
      synapseCount: cloneCountMap,
    });

    const currentSynapsesPlacementConfig = synapsesPlacement?.[id];
    if (currentSynapsesPlacementConfig?.visible) {
      setSynapsesPlacement((prev) => {
        const newValue = structuredClone(prev);
        if (newValue) delete newValue[id];
        return newValue;
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
    if (currentSynapsesPlacementConfig?.visible) {
      setSynapsesPlacement((prev) => {
        const newValue = structuredClone(prev);
        if (!newValue) return newValue;

        delete newValue[id];
        return newValue;
      });
    } else if (currentSynapsesPlacementConfig?.sectionSynapses && synapseSet) {
      console.log('🐞 [synapse-set-menu-item@139] synapseSet =', synapseSet); // @FIXME: Remove this line written on 2026-02-25 at 14:43
      setSynapsesPlacement((prev) => ({
        ...prev,
        [id]: {
          ...currentSynapsesPlacementConfig,
          color: synapseSet.color,
          visible: true,
        },
      }));
    }
  };
  // const values = sessionValue?.synapseSets?.values();
  // useViewer3D(values ? Array.from(values) : [], synapsesPlacement ?? {}, sessionId);

  return (
    <div className="flex max-h-[300px] flex-col gap-1.5">
      <div className="secondary-scrollbar flex-1 overflow-y-auto pr-1">
        {Array.from(sessionValue?.synapseSets?.values() ?? [])
          ?.filter((o) => SingleNeuronSynaptomeBaseSchema.safeParse(o).success)
          .map((o) => {
            const isVisible = !!synapsesPlacement?.[o.id]?.visible;
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
                          className="h-5 w-5 flex-shrink-0 rounded-full"
                          style={{ background: o.color, marginRight: '-8px' }}
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
                        <VisibilityButton
                          breakpoint={breakpoint}
                          isVisible={isVisible}
                          canShow={canShow}
                          id={o.id}
                          onToggleVisibility={onToggleVisibility}
                        />
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

function VisibilityButton({
  id,
  isVisible,
  canShow,
  breakpoint,
  onToggleVisibility,
}: {
  id: string;
  isVisible: boolean;
  canShow: boolean;
  breakpoint: string;
  onToggleVisibility: (id: string) => void;
}) {
  return (
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
        isVisible
          ? 'hover:border-orange-500 hover:bg-orange-500'
          : canShow
            ? 'hover:border-secondary-4 hover:bg-secondary-3'
            : 'opacity-50 hover:border-gray-400 hover:bg-gray-400'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onToggleVisibility(id);
      }}
      title={
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
  );
}

function useViewer3D(
  synapticInputs: { id: string; color?: string }[],
  selection: Record<string, SectionSynapsesFor3D | null>,
  sessionId: string
) {
  const update = useVisibleSynapsesSetter(sessionId);
  React.useEffect(() => {
    const synapses: {
      color: string;
      data: Float32Array;
    }[] = [];
    for (let index = 0; index < synapticInputs.length; index++) {
      const synapticInput = synapticInputs[index];
      const match = Object.values(selection).find(
        (item) => item?.synapsePlacementConfigId === synapticInput.id
      );
      if (match) {
        synapses.push({
          color: synapticInput.color ?? getColorFromGeneratedPalette(index),
          data: makeData(match.sectionSynapses),
        });
      }
    }
    update(synapses);
  }, [synapticInputs, selection, update]);
}

function makeData(
  sections: {
    synapses: Array<{
      coordinates: number[];
    }>;
  }[]
) {
  const data: number[] = [];
  for (const section of sections) {
    for (const { coordinates } of section.synapses) {
      const [x, y, z] = coordinates;
      data.push(x, y, z, 1);
    }
  }
  return new Float32Array(data);
}

// Reset the colors.
function resetColors(cloneMap: Map<string, TSingleNeuronSynaptomeConfiguration>) {
  let index = 0;
  for (const [, val] of cloneMap.entries()) {
    val.color = getColorFromGeneratedPalette(index++);
  }
  return cloneMap;
}
