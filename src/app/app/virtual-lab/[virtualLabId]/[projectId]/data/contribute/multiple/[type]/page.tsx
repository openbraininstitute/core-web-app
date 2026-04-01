'use client';

import { snakeCase } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';
import { use } from 'react';
import { match } from 'ts-pattern';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { CellMorphologyImport } from '@/ui/segments/contribute/cell-morphology';
import { ElectricalCellRecordingImport } from '@/ui/segments/contribute/electrical-cell-recording';

import type { ServerSideComponentProp } from '@/types/common';
import type { KebabCase } from '@/utils/type';

function Page({
  params,
}: ServerSideComponentProp<{ type: KebabCase<TExtendedEntitiesTypeDict> }, null>) {
  const { type } = use(params);
  const usedType = snakeCase(type) as TExtendedEntitiesTypeDict;
  const entity = getEntityByExtendedType({ type: usedType });
  const title = `Import ${entity?.title ?? 'artifact'} from CSV`;

  const content = match({ type: usedType })
    .with(
      {
        type: ExtendedEntitiesTypeDict.CellMorphology,
      },
      () => <CellMorphologyImport title={title} />
    )
    .with(
      {
        type: ExtendedEntitiesTypeDict.ElectricalCellRecording,
      },
      () => <ElectricalCellRecordingImport title={title} />
    )
    .otherwise(() => notFound());

  return (
    <div className="bg-background ml-3 h-full w-[calc(100%-10px)] gap-4 overflow-hidden rounded-2xl [grid-area:main]">
      {content}
    </div>
  );
}

export default Page;
