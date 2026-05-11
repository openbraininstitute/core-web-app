import { Image as AntdImage, Segmented } from 'antd';
import { useLayoutEffect, useState } from 'react';

import { BrokenImageIcon, ImageIcon } from '@/components/icons/image-states';
import { CircuitNodesTable } from '@/features/circuit-nodes';
import { useCircuitImageURL } from '@/features/scan-config/components/hooks/circuit';
import { Skeleton } from '@/ui/molecules/skeleton';
import { classNames } from '@/util/utils';

import CircuitViz from '../circuit-viz';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { DisplayMode } from '@/features/circuit-nodes';

import styles from '@/features/scan-config/components/model-preview/circuit-preview.module.css';

interface CircuitPreviewProps {
  className?: string;
  circuit: ICircuit;
}

export function CircuitPreview({ className, circuit }: CircuitPreviewProps) {
  const [mode, setMode] = useState<'image' | 'viz'>('image');

  return (
    <div className="h-full flex flex-col">
      <Segmented
        className="self-end mb-3"
        options={[
          { label: 'Image View', value: 'image' },
          { label: 'Visualization', value: 'viz' },
        ]}
        onChange={(v) => setMode(v as 'image' | 'viz')}
      />
      <div className="flex-1">
        {mode === 'image' && <CircuitImage className={className} circuit={circuit} />}
        {mode === 'viz' && <CircuitViz key={circuit.id} id={circuit.id} />}
      </div>
    </div>
  );
}

export function CircuitImage({ className, circuit }: CircuitPreviewProps) {
  const { data, isLoading, error } = useCircuitImageURL(circuit?.id);
  const [loaded, setLoaded] = useState(false);
  const [tableMode, setTableMode] = useState<DisplayMode>('collapsed');

  useLayoutEffect(() => {
    if (!data) return;

    const img = new Image();
    img.src = data;
    img.onload = () => {
      setLoaded(true);
    };
  }, [data]);

  return (
    <div className={classNames(styles.container, className)}>
      {tableMode !== 'full' && (
        <div className={classNames(styles.imageSlot, styles[`imageSlot_${tableMode}`])}>
          {isLoading && (
            <Skeleton className="flex rounded-2xl items-center justify-center w-full h-full">
              <ImageIcon className="w-20 h-20 text-gray-300 rounded-2xl" />
            </Skeleton>
          )}
          {!isLoading && (error || !data) && (
            <Skeleton
              active={false}
              className="flex rounded-2xl items-center justify-center w-full h-full"
            >
              <BrokenImageIcon className="w-20 h-20 text-gray-300 rounded-2xl" />
            </Skeleton>
          )}
          {!isLoading && !error && data && !loaded && (
            <Skeleton className="flex rounded-2xl items-center justify-center w-full h-full">
              <ImageIcon className="w-20 h-20 text-gray-300 rounded-2xl" />
            </Skeleton>
          )}
          {!isLoading && !error && data && loaded && (
            <div
              id="scan-config-circuit-preview"
              className="w-full h-full min-h-0 p-2 overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)] bg-white"
            >
              <div className="w-full h-full overflow-hidden bg-white rounded-2xl [&_.ant-image]:block! [&_.ant-image]:w-full! [&_.ant-image]:h-full! [&_.ant-image-img]:w-full! [&_.ant-image-img]:h-full! [&_.ant-image-img]:object-contain!">
                <AntdImage
                  src={data}
                  alt="Circuit preview"
                  className="block! w-full! h-full! [&_.ant-image-mask]:rounded-2xl"
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              </div>
            </div>
          )}
        </div>
      )}
      <CircuitNodesTable circuit={circuit} onModeChange={setTableMode} />
    </div>
  );
}
