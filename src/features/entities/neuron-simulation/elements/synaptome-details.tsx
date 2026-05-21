'use client';

import Link from 'next/link';

import { renderArray, renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { Field } from '@/features/entities/neuron-simulation/elements/field';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { PreviewThumbnail } from '@/features/thumbnail/preview';
import {
  detailViewHeadingClass,
  detailViewLabelClass,
  detailViewLinkClass,
  detailViewPanelBorderClass,
  type DetailViewVariant,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { IMEModel, ISingleNeuronSynaptome } from '@/api/entitycore/types';

type Props = {
  virtualLabId: string;
  projectId: string;
  meModel: IMEModel;
  synaptome: ISingleNeuronSynaptome;
  variant?: DetailViewVariant;
};

export default function ModelDetails({
  virtualLabId,
  projectId,
  meModel,
  synaptome,
  variant = 'light',
}: Props) {
  return (
    <div>
      <h1 className={cn('mb-3', detailViewHeadingClass(variant))}>Model</h1>
      <div
        className={cn(
          'relative flex max-h-fit items-start gap-4 rounded-sm border px-8 py-6',
          detailViewPanelBorderClass(variant)
        )}
      >
        <Link
          href={resolveExploreDetailsPageUrl({
            ctx: { virtualLabId, projectId },
            dataType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
            entityId: synaptome.id,
          })}
          className={cn(
            'absolute top-6 right-8 flex items-center justify-center',
            detailViewLinkClass(variant)
          )}
        >
          View details
        </Link>
        <div className="flex flex-col">
          <span className={cn('mb-2 text-base uppercase', detailViewLabelClass(variant))}>
            Synaptome
          </span>
          <div className="flex items-start gap-2">
            <div className="border-neutral-3 flex h-60 w-60 items-center justify-center border bg-white">
              <PreviewThumbnail entity={meModel.morphology} height={196} width={196} />
            </div>

            <div className="border-neutral-3 flex h-60 w-60 items-center justify-center border bg-white">
              <PreviewThumbnail entity={meModel.emodel} height={196} width={196} />
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <div className="pl-12">
            <Field
              label="Name"
              value={synaptome.name}
              variant={variant}
              className="my-1 text-3xl font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pl-12">
            <Field label="ME-Model" value={meModel.name} variant={variant} />
            {meModel.mtypes && meModel.mtypes.length > 0 && (
              <Field
                label="M-Types"
                value={renderEmptyOrValue(renderArray(meModel.mtypes.map((m) => m.pref_label)))}
                variant={variant}
              />
            )}
            <Field label="Brain Region" value={meModel.brain_region.name} variant={variant} />
            {meModel.etypes && meModel.etypes.length > 0 && (
              <Field
                label="E-Types"
                value={renderEmptyOrValue(renderArray(meModel.etypes.map((m) => m.pref_label)))}
                variant={variant}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
