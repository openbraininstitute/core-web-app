import { Image as AntdImage, Segmented } from 'antd';
import { useLayoutEffect, useState } from 'react';

import { BrokenImageIcon, ImageIcon } from '@/components/icons/image-states';
import { useCircuitImageURL } from '@/features/scan-config/components/hooks/circuit';
import { Skeleton } from '@/ui/molecules/skeleton';
import { classNames } from '@/util/utils';

import CircuitViz from '../circuit-viz';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

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
        <CircuitViz key={circuit.id} id={circuit.id} visible={mode === 'viz'} />
      </div>
    </div>
  );
}

export function CircuitImage({ className, circuit }: CircuitPreviewProps) {
  const { data, isLoading, error } = useCircuitImageURL(circuit?.id);
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    if (!data) return;

    const img = new Image();
    img.src = data;
    img.onload = () => {
      setLoaded(true);
    };
  }, [data]);

  if (isLoading) {
    return (
      <Skeleton className="flex items-center justify-center w-full h-full">
        <ImageIcon className="w-20 h-20 text-gray-300" />
      </Skeleton>
    );
  }

  if (error || !data) {
    return (
      <Skeleton
        active={false}
        className="flex rounded-2xl items-center justify-center w-full h-full"
      >
        <BrokenImageIcon className="w-20 h-20 text-gray-300  rounded-2xl " />
      </Skeleton>
    );
  }
  if (!loaded) {
    return (
      <Skeleton className="flex rounded-2xl items-center justify-center w-full h-full">
        <ImageIcon className="w-20 h-20 text-gray-300  rounded-2xl " />
      </Skeleton>
    );
  }

  return (
    <div
      id="scan-config-circuit-preview"
      className={classNames(
        'w-full h-full min-h-0 p-2 overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)] bg-white',
        className
      )}
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
  );
}
