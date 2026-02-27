'use client';

import { DeleteOutlined, EyeInvisibleOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
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
  useBuildSingleNeuronSynaptomeSessionState,
} from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { SynapsesPlacementAtomFamily } from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { getRandomIntInclusive } from '@/util/utils';
import { cn } from '@/utils/css-class';
import { formatCompactNumber } from '@/utils/format';

import { AddSynapticSetButton } from './add-synaptic-set-button';
import { resetColors } from './colors';

import type { SynapsesPlacementRecord } from '../../simulate/single-neuron/shared/types';

type Props = { sessionId: string };

export function SynapseSetMenuItems({ sessionId }: Props) {
  const params = useSearchParams();
  const pathname = usePathname();
  const breakpoint = useDefaultBreakpoint();
  const { replace } = useRouter();
  const { sessionValue, setSessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });
  const [synapsesPlacement, setSynapsesPlacement] = useAtom(SynapsesPlacementAtomFamily(sessionId));
  React.useEffect(() => {
    const sets = sessionValue?.synapseSets;
    if (!sets) {
      setSynapsesPlacement({});
      return;
    }

    setSynapsesPlacement((prev) => {
      let hasChanges = false;
      const newValue: SynapsesPlacementRecord = structuredClone(prev) ?? {};
      for (const set of sets.values()) {
        const item = newValue[set.id];
        if (!item || item.color === set.color) continue;

        item.color = set.color;
        hasChanges = true;
      }
      return hasChanges ? newValue : prev;
    });
  }, [sessionValue?.synapseSets, setSynapsesPlacement]);

  const currentSet = params.get('set');

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
    resetColors(cloneMap);
    setSessionValue({
      ...sessionValue,
      seed: sessionValue?.seed ?? 100,
      synapseSets: cloneMap,
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

      <AddSynapticSetButton sessionId={sessionId} />
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
