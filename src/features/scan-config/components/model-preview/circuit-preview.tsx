//import { Skeleton } from 'antd';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { BrokenImageIcon, ImageIcon } from '@/components/icons/image-states';
import ZoomableImage from '@/components/zoomable-image';
import { useCircuitImageURL } from '@/features/scan-config/components/hooks/circuit';
import { Skeleton } from '@/ui/molecules/skeleton';
import { classNames } from '@/util/utils';
import styles from './circuit-preview.module.css';

interface CircuitPreviewProps {
  className?: string;
  circuit: ICircuit;
}

export function CircuitPreview({ className, circuit }: CircuitPreviewProps) {
  const { data, isLoading, error } = useCircuitImageURL(circuit?.id);
  if (isLoading) {
    return (
      <Skeleton className="flex items-center justify-center w-full h-full">
        <ImageIcon className="w-20 h-20 text-gray-300" />
      </Skeleton>
    );
  }
  if (error) {
    <Skeleton active={false} className="flex items-center justify-center w-full h-full">
      <ImageIcon className="w-20 h-20 text-gray-300" />
    </Skeleton>;
  }
  return (
    <div className={classNames('pl-5', className, styles.circuitPreview, data && styles.show)}>
      <ZoomableImage src={data} className={styles.image} />
    </div>
  );
}
