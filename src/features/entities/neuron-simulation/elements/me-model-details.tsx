'use client';

import Link from 'next/link';

import { renderArray, renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { Field } from '@/features/entities/neuron-simulation/elements/field';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { PreviewThumbnail } from '@/features/thumbnail/preview';

import type { IMEModel } from '@/api/entitycore/types';

type Props = {
  virtualLabId: string;
  projectId: string;
  meModel: IMEModel;
};

export default function ModelDetails({ virtualLabId, projectId, meModel }: Props) {
  return (
    <div>
      <h1 className="text-primary-8 mb-3 text-3xl font-bold">Model</h1>
      <div className="relative flex max-h-fit items-start gap-4 rounded-sm border border-neutral-200 px-8 py-6">
        <Link
          href={resolveExploreDetailsPageUrl({
            ctx: { virtualLabId, projectId },
            dataType: ExtendedEntitiesTypeDict.Memodel,
            entityId: meModel.id,
          })}
          className="text-primary-8 hover:text-primary-7 absolute top-6 right-8 flex items-center justify-center font-bold"
        >
          View details
        </Link>
        <div className="flex flex-col">
          <span className="text-neutral-4 mb-2 text-base uppercase">Single neuron model</span>
          <div className="flex items-start gap-2">
            <div className="border-neutral-3 flex h-60 w-60 items-center justify-center border bg-white">
              <PreviewThumbnail resource={meModel.morphology} height={196} width={196} />
            </div>

            <div className="border-neutral-3 flex h-60 w-60 items-center justify-center border bg-white">
              <PreviewThumbnail resource={meModel.emodel} height={196} width={196} />
            </div>
          </div>
        </div>
        <div className="mt-6 flex max-w-max min-w-0 grow flex-col gap-3">
          <div className="pl-12">
            <Field
              label="Name"
              value={meModel.name}
              className="text-primary-8 my-1 line-clamp-2 min-w-0 text-3xl font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pl-12">
            <Field label="ME-Model" value={meModel.name} />
            <Field label="E-Model" value={meModel.emodel.name} />
            <Field label="M-Model" value={meModel.morphology.name} />
            <Field label="Brain Region" value={meModel.brain_region.name} />

            {meModel.mtypes && meModel.mtypes.length > 0 && (
              <Field
                label="M-Types"
                value={renderEmptyOrValue(renderArray(meModel.mtypes.map((m) => m.pref_label)))}
              />
            )}
            {meModel.etypes && meModel.etypes.length > 0 && (
              <Field
                label="E-Types"
                value={renderEmptyOrValue(renderArray(meModel.etypes.map((m) => m.pref_label)))}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
