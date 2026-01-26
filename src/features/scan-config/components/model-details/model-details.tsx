import { Input } from 'antd';
import type { IMEModel } from '@/api/entitycore/types';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';

interface ModelDetailsProps {
  className?: string;
  model: ICircuit | IMEModel;
}

export default function ModelDetails({ className, model }: ModelDetailsProps) {
  return (
    <div className={className}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-0.5">
            <Input size="middle" value={model.id} disabled />
            <Input size="middle" value={model.name} disabled />
          </div>
        </TooltipTrigger>
        <TooltipContent
          avoidCollisions
          hideWhenDetached
          align="center"
          side="bottom"
          className="text-white shadow-bnb max-w-2xs min-w-2xs rounded-md bg-[#0050b3ee] px-4 py-2 text-base text-wrap"
          arrowClassName="bg-[#0050b3ee]"
        >
          {model.description}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
