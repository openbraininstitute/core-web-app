import { IconSpinner } from '@/components/icons/spinner';
import { cn } from '@/utils/css-class';

import styles from './loading-neuron-spinner.module.css';

export interface LoadingNeuronSpinnerProps {
  className?: string;
}

export function LoadingNeuronSpinner({ className }: LoadingNeuronSpinnerProps) {
  return (
    <div className={cn(className, styles.loadingNeuronSpinner)}>
      <IconSpinner />
      <div>Loading Neuron...</div>
    </div>
  );
}
