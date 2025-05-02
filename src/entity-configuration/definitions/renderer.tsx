'use client';

import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import isEmpty from 'lodash/isEmpty';
import isNil from 'lodash/isNil';
import find from 'lodash/find';
import { Empty } from 'antd';

import PreviewThumbnail from '@/features/thumbnail/preview';
import PreviewImage from '@/features/thumbnail/image';

import type {
  EntityCoreResource,
  MeasurementBase,
  ILicense,
} from '@/api/entitycore/types/shared/global';
import type { EntityCoreDensityObjectTypes } from '@/api/entitycore/types';

export const EmptyValue = '—';
export const EmptyPreview = (
  <Empty
    key={`no-asset-empty-thumbnail`}
    description="Error loading thumbnail"
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    className="h-full! w-full!"
  />
);

export const renderLicense = ({ license }: { license?: ILicense | null }) => {
  if (!license) return null;
  return (
    <a
      title={license.label ?? license.description ?? ''}
      id={license.id}
      href={license.name}
      target="_blank"
      rel="noopener noreferrer"
    >
      Open 🔗
    </a>
  );
};

export const renderEmptyOrValue = (value: any) => {
  return isNil(value) || isEmpty(value) ? EmptyValue : value;
};

export const renderArray = (array: string[]) => {
  return array.map((item) => <div key={item}>{item}</div>);
};

export const renderDate = (isoDateString: string) => {
  if (!isoDateString) return EmptyValue;
  return format(parseISO(isoDateString), 'dd.MM.yyyy');
};

export const renderTimestamp = (timestamp: string) => {
  if (isValid(timestamp)) return formatDistanceToNow(timestamp, { addSuffix: true });
};

export function renderPreview<T extends EntityCoreResource>(
  resource: T,
  size?: { height: number; width: number } | string
) {
  return <PreviewThumbnail resource={resource} size={size} />;
}

export function renderImage<T extends EntityCoreResource>(
  resource: T,
  size?: { height: number; width: number } | string
) {
  return <PreviewImage resource={resource} size={size} />;
}

export default function getMeasurements(r: EntityCoreDensityObjectTypes) {
  const mean = find(r.measurements, { name: 'mean' });
  const std = find(r.measurements, { name: 'standard_deviation' });
  const ss = find(r.measurements, { name: 'sample_size' });
  const se = find(r.measurements, { name: 'standard_error' });
  return { mean, std, ss, se };
}

export function renderFloatNumber(num?: number, fixed: number = 4) {
  if (!num) return '';
  return Number(num.toPrecision(fixed)).toLocaleString('en-US');
}

export function renderMeanStd({
  std,
  mean,
}: {
  mean: MeasurementBase | undefined;
  std: MeasurementBase | undefined;
}) {
  // const muMinusOne = (
  //   <span className="text-neutral-4">
  //     µm<sup>-1</sup>
  //   </span>
  // );
  let field = std
    ? `${renderFloatNumber(mean?.value)} ± ${renderFloatNumber(std?.value)}`
    : `${renderFloatNumber(mean?.value)}`;
  return <>{field}</>;
}
