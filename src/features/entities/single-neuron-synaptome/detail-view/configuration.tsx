'use client';

import Link from 'next/link';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IEType, IMType } from '@/api/entitycore/types/shared/global';
import {
  renderArray,
  renderEmptyOrValue,
  renderPreview,
} from '@/entity-configuration/definitions/renderer';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

export default function Configuration({
  memodel,
  virtualLabId,
  projectId,
}: {
  memodel: IMEModel;
  virtualLabId: string;
  projectId: string;
}) {
  return (
    <div className="relative mt-2 flex gap-10 overflow-hidden rounded-md border border-gray-400 p-4">
      <Link
        href={resolveExploreDetailsPageUrl({
          ctx: { virtualLabId, projectId },
          dataType: ExtendedEntitiesTypeDict.Memodel,
          entityId: memodel.id,
        })}
        className="text-primary-8 hover:text-primary-7 absolute top-4 right-4 flex items-center justify-center font-bold"
      >
        View details
      </Link>
      <div className="flex flex-shrink-0 flex-col items-start gap-2">
        <div className="mb-2 text-xl font-light text-gray-400 uppercase">single neuron model</div>
        <div className="flex items-start gap-2">
          <div className="border-neutral-3 flex h-56 w-56 items-center justify-center border">
            {renderPreview<ICellMorphology>(memodel.morphology, {
              height: 200,
              width: 200,
            })}
          </div>
          <div className="border-neutral-3 flex h-56 w-56 items-center justify-center border">
            {renderPreview(memodel.emodel, { height: 200, width: 200 })}
          </div>
        </div>
      </div>
      <div className="mt-12 min-w-0 flex-1">
        <div className="text-neutral-4 font-thin uppercase">NAME</div>
        <div className="text-primary-8 my-1 text-3xl font-bold break-words">{memodel.name}</div>
        <MeModelDetails memodel={memodel} />
      </div>
    </div>
  );
}

type ModelDetails = {
  memodel: IMEModel;
};

function MeModelDetails({ memodel }: ModelDetails) {
  const mmodel = memodel.morphology;
  const { emodel } = memodel;

  return (
    <div className="text-primary-8 mt-4 grid grid-cols-2 gap-4 gap-x-12">
      <div className="col-span-1">
        <div className="text-neutral-4 font-thin uppercase">m-model</div>
        <div className="break-words">{renderEmptyOrValue(mmodel.name)}</div>
      </div>
      <div className="col-span-1">
        <div className="text-neutral-4 font-thin uppercase">e-model</div>
        <div className="break-words">{renderEmptyOrValue(emodel.name)}</div>
      </div>
      <div className="col-span-1">
        <div className="text-neutral-4 font-thin uppercase">Brain Region</div>
        <div className="break-words">{renderEmptyOrValue(memodel.brain_region.name)}</div>
      </div>
      <div className="col-span-1">
        <div className="text-neutral-4 font-thin uppercase">E-Type</div>
        <div className="break-words">
          {renderEmptyOrValue(
            renderArray(
              (memodel as EntityCoreObjectTypes & { etypes: Array<IEType> | null }).etypes?.map(
                (m) => m.pref_label
              ) || []
            )
          )}
        </div>
      </div>
      <div className="col-span-2">
        <div className="text-neutral-4 font-thin uppercase">M-Type</div>
        <div className="break-words">
          {renderEmptyOrValue(
            renderArray(
              (memodel as EntityCoreObjectTypes & { mtypes: Array<IMType> | null }).mtypes?.map(
                (m) => m.pref_label
              ) || []
            )
          )}
        </div>
      </div>
    </div>
  );
}
