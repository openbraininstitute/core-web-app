'use client';

import Link from 'next/link';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TViewVariant, ViewVariant } from '@/constants';
import {
  renderArray,
  renderEmptyOrValue,
  renderPreview,
} from '@/entity-configuration/definitions/renderer';
import {
  detailViewHeadingClass,
  detailViewLabelClass,
  detailViewLinkClass,
  detailViewPanelBorderClass,
  detailViewValueClass,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ReactNode } from 'react';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { IEType, IMType } from '@/api/entitycore/types/shared/global';

export default function Configuration({
  memodel,
  virtualLabId,
  projectId,
  variant = ViewVariant.Light,
}: {
  memodel: IMEModel;
  virtualLabId: string;
  projectId: string;
  variant?: TViewVariant;
}) {
  return (
    <div
      className={cn(
        'relative mt-2 flex gap-10 overflow-hidden rounded-md border p-4',
        detailViewPanelBorderClass(variant)
      )}
    >
      <Link
        href={resolveExploreDetailsPageUrl({
          ctx: { virtualLabId, projectId },
          dataType: ExtendedEntitiesTypeDict.Memodel,
          entityId: memodel.id,
        })}
        className={cn(
          'absolute top-4 right-4 flex items-center justify-center',
          detailViewLinkClass(variant)
        )}
      >
        View details
      </Link>
      <div className="flex flex-shrink-0 flex-col items-start gap-2">
        <div className={cn('mb-2 text-xl font-light uppercase', detailViewLabelClass(variant))}>
          single neuron model
        </div>
        <div className="flex items-start gap-2">
          <div className="border-neutral-3 flex h-56 w-56 items-center justify-center border bg-white">
            {renderPreview<ICellMorphology>(memodel.morphology, {
              height: 200,
              width: 200,
            })}
          </div>
          <div className="border-neutral-3 flex h-56 w-56 items-center justify-center border bg-white">
            {renderPreview(memodel.emodel, { height: 200, width: 200 })}
          </div>
        </div>
      </div>
      <div className="mt-12 min-w-0 flex-1">
        <div className={detailViewLabelClass(variant)}>NAME</div>
        <div className={cn('my-1 break-words', detailViewHeadingClass(variant))}>
          {memodel.name}
        </div>
        <MeModelDetails memodel={memodel} variant={variant} />
      </div>
    </div>
  );
}

type ModelDetails = {
  memodel: IMEModel;
  variant: TViewVariant;
};

function MeModelDetails({ memodel, variant }: ModelDetails) {
  const mmodel = memodel.morphology;
  const { emodel } = memodel;

  const fields: Array<{ label: string; value: ReactNode; span?: 2 }> = [
    { label: 'm-model', value: renderEmptyOrValue(mmodel.name) },
    { label: 'e-model', value: renderEmptyOrValue(emodel.name) },
    { label: 'Brain Region', value: renderEmptyOrValue(memodel.brain_region.name) },
    {
      label: 'E-Type',
      value: renderEmptyOrValue(
        renderArray(
          (memodel as EntityCoreObjectTypes & { etypes: Array<IEType> | null }).etypes?.map(
            (m) => m.pref_label
          ) || []
        )
      ),
    },
    {
      label: 'M-Type',
      value: renderEmptyOrValue(
        renderArray(
          (memodel as EntityCoreObjectTypes & { mtypes: Array<IMType> | null }).mtypes?.map(
            (m) => m.pref_label
          ) || []
        )
      ),
      span: 2,
    },
  ];

  return (
    <div className={cn('mt-4 grid grid-cols-2 gap-4 gap-x-12', detailViewValueClass(variant))}>
      {fields.map((field) => (
        <div key={field.label} className={field.span === 2 ? 'col-span-2' : 'col-span-1'}>
          <div className={detailViewLabelClass(variant)}>{field.label}</div>
          <div className="break-words">{field.value}</div>
        </div>
      ))}
    </div>
  );
}
