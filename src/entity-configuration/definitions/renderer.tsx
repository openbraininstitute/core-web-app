import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import isNil from 'lodash/isNil';
import isEmpty from 'lodash/isEmpty';

import PreviewThumbnail from '@/features/thumbnail/preview';
import type {
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreResource,
  MeasurementBase,
} from '@/api/entitycore/types/shared/global';
import { EntityCoreDensityObjectTypes } from '@/api/entitycore/types';
import find from 'lodash/find';

export const EmptyValue = '—';

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

export function renderPreview<T extends EntityCoreBaseAsset & EntityCoreIdentifiable>(
  resource: T,
  size?: { height: number; width: number } | string
) {
  return <PreviewThumbnail resource={resource} size={size} />;
}

export default function getMeasurements(r: EntityCoreDensityObjectTypes) {
  const mean = find(r.measurements, { name: 'mean' });
  const std = find(r.measurements, { name: 'standard_deviation' });
  const ss = find(r.measurements, { name: 'sample_size' });
  const se = find(r.measurements, { name: 'standard_error' });
  return { mean, std, ss, se };
}

function renderFloatNumber(num?: number, fixed: number = 4) {
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
