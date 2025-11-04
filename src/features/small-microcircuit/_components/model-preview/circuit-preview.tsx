import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import ZoomableImage from '@/components/zoomable-image';
import { useCircuitImageURL } from '@/features/small-microcircuit/_components/hooks/circuit';
import { classNames } from '@/util/utils';

import styles from './circuit-preview.module.css';

interface CircuitPreviewProps {
  className?: string;
  circuit: ICircuit;
}

export function CircuitPreview({ className, circuit }: CircuitPreviewProps) {
  const url = useCircuitImageURL(circuit?.id);

  return (
    <div className={classNames('px-5', className, styles.circuitPreview, url && styles.show)}>
      <ZoomableImage src={url} className={styles.image} />
    </div>
  );
}
