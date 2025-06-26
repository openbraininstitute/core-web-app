'use client';

import { Empty } from 'antd';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import isNil from 'lodash/isNil';
import { ReactNode } from 'react';

import PreviewImage from '@/features/thumbnail/image';
import PreviewThumbnail from '@/features/thumbnail/preview';

import type {
  EntityCoreDensityObjectTypes,
  IReconstructionMorphology,
} from '@/api/entitycore/types';
import { IReconstructionMorphologyExpanded } from '@/api/entitycore/types/entities/reconstruction-morphology';
import { IEModel } from '@/api/entitycore/types/entities/e-model';
import { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type {
  EntityCoreResource,
  ILicense,
  MeasurementBase,
} from '@/api/entitycore/types/shared/global';

export const EmptyValue = '—';

export const EmptyPreview = (
  <Empty
    key="no-asset-empty-thumbnail"
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

export const renderAsString = (value: any) => {
  return String(value);
};

export const renderArray = (array: string[]) => {
  return array.map((item) => <div key={item}>{item}</div>);
};

export const renderDate = (isoDateString: string) => {
  if (!isoDateString) return EmptyValue;
  return format(parseISO(isoDateString), 'dd.MM.yyyy');
};

export const renderTimestamp = (timestamp: Date) => {
  if (isValid(timestamp)) return formatDistanceToNow(timestamp, { addSuffix: true });
};

export function renderPreview<T extends EntityCoreResource>(
  resource: T,
  size?: { height?: number | string; width?: number | string },
  className?: string
) {
  return (
    <PreviewThumbnail
      resource={resource}
      width={size?.width}
      height={size?.height}
      className={className}
    />
  );
}

export function renderImage(
  entity: IEModel | IMEModel,
  size?: { height: number | string; width: number | string },
  className?: string
) {
  return <PreviewImage size={size} className={className} />;
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
  const field = std
    ? `${renderFloatNumber(mean?.value)} ± ${renderFloatNumber(std?.value)}`
    : `${renderFloatNumber(mean?.value)}`;
  return <>{field}</>;
}

/**
 * Renders a specific morphology measurement
 *
 * @param {IReconstructionMorphologyExpanded} morphology
 * @param {string} structuralDomain - The compartment to serialize.
 * @param {string} label - The label to serialize.
 * @param {string} measurementType - The statistic to serialize.
 * @param {boolean} showUnits - Whether to show the units.
 *
 * @returns {string} - The rendered text value.
 */
export const renderMorphologyMeasurement = (
  morphology: IReconstructionMorphologyExpanded | IReconstructionMorphology,
  structuralDomain: string,
  label: string,
  measurementType: string,
  showUnits?: boolean
): ReactNode => {
  if (!morphology || !('measurement_annotation' in morphology)) return EmptyValue;

  const measurementKinds = morphology.measurement_annotation.measurement_kinds;

  const measurementKind = measurementKinds?.find(
    (mk) => mk.structural_domain === structuralDomain && mk.pref_label === label
  );

  const measurement = measurementKind?.measurement_items.find((mi) => mi.name === measurementType);

  if (!measurement) return EmptyValue;

  const { unit } = measurement;
  let { value } = measurement;

  const unitSuffix = showUnits ? `${unit}` : '';

  // TODO: This is a workaround to show soma diameter when a radius is provided.
  if (label === 'soma_radius') value = 2 * measurement.value;

  return `${renderFloatNumber(value)}${unitSuffix}`;
};
