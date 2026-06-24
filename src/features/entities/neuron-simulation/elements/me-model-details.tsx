'use client';

import Link from 'next/link';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TViewVariant, ViewVariant } from '@/constants';
import { renderArray, renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { Field } from '@/features/entities/neuron-simulation/elements/field';
import { PreviewThumbnail } from '@/features/thumbnail/preview';
import {
  detailViewHeadingClass,
  detailViewLabelClass,
  detailViewLinkClass,
  detailViewPanelBorderClass,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { IMEModel } from '@/api/entitycore/types';

type Props = {
  virtualLabId: string;
  projectId: string;
  meModel: IMEModel;
  variant?: TViewVariant;
};

export default function ModelDetails({
  virtualLabId,
  projectId,
  meModel,
  variant = ViewVariant.Light,
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
            dataType: ExtendedEntitiesTypeDict.Memodel,
            entityId: meModel.id,
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
            Single neuron model
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
        <div className="mt-6 flex max-w-max min-w-0 grow flex-col gap-3">
          <div className="pl-12">
            <Field
              label="Name"
              value={meModel.name}
              variant={variant}
              className={cn('my-1 line-clamp-2 min-w-0 text-3xl font-bold')}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pl-12">
            <Field label="ME-Model" value={meModel.name} variant={variant} />
            <Field label="E-Model" value={meModel.emodel.name} variant={variant} />
            <Field label="M-Model" value={meModel.morphology.name} variant={variant} />
            <Field label="Brain Region" value={meModel.brain_region.name} variant={variant} />

            {meModel.mtypes && meModel.mtypes.length > 0 && (
              <Field
                label="M-Types"
                value={renderEmptyOrValue(renderArray(meModel.mtypes.map((m) => m.pref_label)))}
                variant={variant}
              />
            )}
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
