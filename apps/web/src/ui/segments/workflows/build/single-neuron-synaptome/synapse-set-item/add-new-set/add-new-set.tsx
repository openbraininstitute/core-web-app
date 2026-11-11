import { cn } from '@/utils/css-class';

import styles from './add-new-set.module.css';

export interface AddNewSetProps {
  className?: string;
}

export function AddNewSet({ className }: AddNewSetProps) {
  return (
    <div className={cn(className, styles.addNewSet)}>
      <h2>Synapse sets</h2>
      <p>To create a new set, click the "Add set" button in the left-hand column.</p>
    </div>
  );
}
