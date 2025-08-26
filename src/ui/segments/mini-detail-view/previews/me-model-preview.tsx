import { JSX } from 'react';
import { Image } from 'antd';

import { renderPreview } from '@/entity-configuration/definitions/renderer';
import { hasAssets } from '@/api/entitycore/guards';

import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import type { IMEModel } from '@/api/entitycore/types';

export function MEModelPreview({ record }: { record: IMEModel }) {
  const morphology = (record as IMEModel)?.morphology;
  let morphologyPreview = null;
  if (hasAssets(morphology))
    morphologyPreview = renderPreview(
      morphology,
      undefined,
      undefined,
      'rounded-md h-auto relative w-full! bg-white',
      'w-full! h-[200px]! flex!',
      true,
      (src) => (
        <Image
          src={src}
          alt={`${record.name} trace`}
          rootClassName="w-full h-full"
          className="h-full! w-full! rounded-md object-contain"
        />
      )
    );
  const tracePreview: JSX.Element | null = renderPreview(
    record as unknown as EntityCoreResource,
    undefined,
    undefined,
    'rounded-md h-auto relative w-full! bg-white ',
    'w-full! h-[200px]! flex!',
    true,
    (src) => (
      <Image
        alt={`${record.name} trace`}
        src={src}
        rootClassName="w-full h-full flex items-center justify-center"
        className="h-full! w-full! rounded-md object-contain"
      />
    )
  );
  return (
    <div
      className="flex h-full w-full items-stretch justify-center gap-2 rounded-md"
      key={record.id}
    >
      {morphologyPreview}
      {tracePreview}
    </div>
  );
}
