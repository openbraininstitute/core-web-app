import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { SynapseSetMenuItems } from '../../synapse-set-menu-item';
import SynapticSetButton from './synaptic-set-button';

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
  memodel,
  active,
  onClick,
  sessionId,
  synapseSets,
}: SectionSynapseSetsProps) {
  return (
    <div className={cn(className, styles.sectionSynapseSets)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex w-full flex-col">
            <SynapticSetButton
              active={active}
              enabled={!!memodel}
              onClick={onClick}
              sessionId={sessionId}
              synapseSets={synapseSets}
            />
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
