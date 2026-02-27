import { cn } from '@/utils/css-class';

import { AddSynapticSetButton } from '../../add-synaptic-set-button';

import styles from './add-new-set.module.css';

export interface AddNewSetProps {
  className?: string;
  sessionId: string;
}

export function AddNewSet({ className, sessionId }: AddNewSetProps) {
  return (
    <div className={cn(className, styles.addNewSet)}>
      <AddSynapticSetButton sessionId={sessionId} />
    </div>
  );
}
