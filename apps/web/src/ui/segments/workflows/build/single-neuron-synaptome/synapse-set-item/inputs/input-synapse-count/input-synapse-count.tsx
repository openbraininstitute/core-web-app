import { cn } from '@/utils/css-class';

import { InputSynapseCountFormula } from './formula';
import { InputSynapseCountSoma } from './soma';

export interface InputSynapseCountProps {
  className?: string;
  target: string | undefined;
}

export function InputSynapseCount({ className, target }: InputSynapseCountProps) {
  return (
    <div className={cn(className, 'flex w-full items-start gap-4')}>
      {target === 'soma' ? <InputSynapseCountSoma /> : <InputSynapseCountFormula />}
    </div>
  );
}
