import { Image } from 'antd';
import type { ComponentProps, JSX } from 'react';
import { hasAssets } from '@/api/entitycore/guards';
import type { IMEModel } from '@/api/entitycore/types';
import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import { renderPreview } from '@/entity-configuration/definitions/renderer';
import { cn } from '@/utils/css-class';

type Props = {
  record: IMEModel;
  cls?: {
    container?: ComponentProps<'div'>['className'];
    morphology?: ComponentProps<'div'>['className'];
    emodel?: ComponentProps<'div'>['className'];
  };
};

export function MEModelPreview({ record, cls }: Props) {
  const morphology = (record as IMEModel)?.morphology;
  let morphologyPreview = null;
  if (hasAssets(morphology))
    morphologyPreview = renderPreview(
      morphology,
      undefined,
      undefined,
      cn('rounded-md h-auto relative w-full! bg-white ', cls?.morphology),
      'w-full! h-[200px]! flex!',
      true,
      (src) => (
        <Image
          src={src}
          alt={`${record.name} trace`}
          rootClassName="w-full h-full"
          className="h-full! w-full! rounded-md object-contain"
        />
      ),
    );

  const tracePreview: JSX.Element | null = renderPreview(
    record as unknown as EntityCoreResource,
    undefined,
    undefined,
    cn('rounded-md h-auto relative w-full! bg-white ', cls?.emodel),
    'w-full! h-[200px]! flex!',
    true,
    (src) => (
      <Image
        alt={`${record.name} trace`}
        src={src}
        rootClassName="w-full h-full flex items-center justify-center"
        className="h-full! w-full! rounded-md object-contain"
      />
    ),
  );
  return (
    <div
      className={cn(
        'flex h-full w-full items-stretch justify-center gap-2 rounded-md',
        cls?.container,
      )}
      key={record.id}
    >
      {morphologyPreview}
      {tracePreview}
    </div>
  );
}
