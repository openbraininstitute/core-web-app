import { RightOutlined } from '@ant-design/icons';
import React from 'react';

import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { SynapseSetMenuItems } from '../../synapse-set-menu-item';
import { useClickWrapper, useValidSetCount } from './hooks';

import type { IMEModel } from '@/api/entitycore/types';
import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';

import styles from './section-synapse-sets.module.css';

export interface SectionSynapseSetsProps {
  className?: string;
  breakpoint: 'l' | 'mobile' | 'xl';
  memodel?: IMEModel;
  active: boolean;
  onClick(): void;
  sessionId: string;
  synapseSets: Map<string, TSingleNeuronSynaptomeConfiguration> | undefined;
}

export default function SectionSynapseSets({
  className,
  breakpoint,
  memodel,
  active,
  onClick,
  sessionId,
  synapseSets,
}: SectionSynapseSetsProps) {
  const validSetsCount = useValidSetCount(synapseSets);
  const handleClick = useClickWrapper(sessionId, onClick);

  return (
    <div className={cn(className, styles.sectionSynapseSets)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex w-full flex-col">
            <Button
              rounded
              variant="outline"
              size={breakpoint === 'l' ? 'md' : 'lg'}
              className={cn('disabled:bg-neutral-1/40 w-full justify-start pr-2 shadow-md')}
              active={active}
              onClick={handleClick}
              disabled={!memodel}
            >
              <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
                <div className="shrink-0 font-bold">Synapse sets</div>
                <div className="ml-auto flex items-center justify-center gap-2">
                  {!!validSetsCount && (
                    <div>
                      {validSetsCount > 1 ? `${validSetsCount} sets` : `${validSetsCount} set`}
                    </div>
                  )}
                  <RightOutlined
                    className={cn('text-neutral-4 mr-2 transition-all', {
                      '-rotate-180 text-white! group-hover:text-white': active,
                    })}
                  />
                </div>
              </div>
            </Button>
          </div>
        </TooltipTrigger>
        {!memodel && (
          <TooltipContent sideOffset={0} side="bottom" arrowClassName="bg-primary-9">
            <p className={cn('text-justify text-base')}>Please select me model first</p>
          </TooltipContent>
        )}
      </Tooltip>
      {memodel && active && (
        <div className="px-4 pt-3">
          <SynapseSetMenuItems sessionId={sessionId} />
        </div>
      )}
    </div>
  );
}
