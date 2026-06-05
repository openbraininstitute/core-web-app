import Link from 'next/link';

import { type TViewVariant, ViewVariant } from '@/constants';
import { renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import {
  detailViewCardBorderClass,
  detailViewHeadingClass,
  detailViewLabelClass,
  detailViewLinkClass,
  detailViewValueClass,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';

type Detail = {
  label: string;
  value: string | ReactNode | undefined;
};

type ModelDetailsProps = {
  details: Detail[];
};

function ModelDetails({ details, variant }: ModelDetailsProps & { variant: TViewVariant }) {
  return (
    <div className={cn('mt-4 grid grid-cols-3 gap-4', detailViewValueClass(variant))}>
      {details.map((detail) => (
        <div key={`${detail.label}-${detail.value?.toString()}`}>
          <div className={detailViewLabelClass(variant)}>{detail.label}</div>
          <div>{renderEmptyOrValue(detail.value)}</div>
        </div>
      ))}
    </div>
  );
}

type Props = {
  // @FIXME: Is this property used somewhere?
  // eslint-disable-next-line react/no-unused-prop-types
  mode: 'select' | 'summary';
  model: IEModel | ICellMorphology;
  title: string;
  selectUrl: string;
  queryParams: string;
  exploreUrl: string;
  modelDetails: Detail[];
  thumbnail: ReactNode;
  reselectLink?: boolean;
  variant?: TViewVariant;
};

export default function ModelCard({
  model,
  title,
  selectUrl,
  queryParams,
  exploreUrl,
  modelDetails,
  thumbnail,
  reselectLink = false,
  variant = ViewVariant.Light,
}: Props) {
  const cardLink = reselectLink ? (
    <Link
      href={{
        pathname: selectUrl,
        query: queryParams,
      }}
      className={detailViewLinkClass(variant)}
    >
      Select a different {title.toLowerCase()}
    </Link>
  ) : (
    <Link href={exploreUrl} target="_blank" className={detailViewLinkClass(variant)}>
      More details
    </Link>
  );

  return (
    <div
      className={cn('w-full rounded-[6px] border p-10', detailViewCardBorderClass(variant), {
        'bg-transparent': variant === ViewVariant.Default,
      })}
    >
      <div className="flex justify-between">
        <div className={cn('text-2xl uppercase font-thin', detailViewLabelClass(variant))}>
          {title}
        </div>
        {cardLink}
      </div>

      <div className="mt-2 flex gap-10">
        <div
          className="border-neutral-2 m-0 flex flex-col items-center justify-center border bg-white"
          style={{ height: 202, width: 202 }}
        >
          {thumbnail}
        </div>
        <div className="grow">
          <div className={detailViewLabelClass(variant)}>NAME</div>
          <div className={cn('my-1 break-words', detailViewHeadingClass(variant))}>
            {model.name}
          </div>
          <ModelDetails details={modelDetails} variant={variant} />
        </div>
      </div>
    </div>
  );
}
