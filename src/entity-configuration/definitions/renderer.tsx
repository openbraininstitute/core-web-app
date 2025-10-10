'use client';

import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { JSX, ReactNode, useEffect, useState } from 'react';
import { Button, Empty, Modal } from 'antd';
import { useParams } from 'next/navigation';
import isEmpty from 'es-toolkit/compat/isEmpty';
import isNil from 'es-toolkit/compat/isNil';
import find from 'es-toolkit/compat/find';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { PreviewThumbnail } from '@/features/thumbnail/preview';
import { tryCatch } from '@/api/utils';

import type { ICellMorphologyExpanded } from '@/api/entitycore/types/entities/cell-morphology';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreDensityObjectTypes, ICellMorphology } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';
import type {
  EntityCoreIdentifiable,
  EntityCoreResource,
  IContributor,
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
      className="line-clamp-1 truncate"
    >
      {license.label ?? 'View license'} 🔗
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
  return array.map((item) => (
    <div key={item} className="line-clamp-1 text-ellipsis" title={item}>
      {item}
    </div>
  ));
};

export const renderDictionaryKeys = (
  dictionary: Record<string, string>,
  Component: React.ComponentType<{ field: string; value: string }>,
  containerClassName?: string
) => {
  return (
    <div className={containerClassName}>
      {Object.entries(dictionary).map(([field, value]) => (
        <Component key={field} field={field} value={value} />
      ))}
    </div>
  );
};

export const renderDate = (isoDateString?: string | null) => {
  if (isNil(isoDateString)) return EmptyValue;
  return format(parseISO(isoDateString), 'dd.MM.yyyy');
};

export const renderEmail = (email?: string | null) => {
  if (isNil(email)) return EmptyValue;
  return (
    <a href={`mailto:${email}`} className="text-primary-8 hover:underline">
      {email}
    </a>
  );
};

export function RenderCustomField<R extends EntityCoreIdentifiable>({
  entityId,
  entityType,
  CustomComponent,
}: {
  entityId: string;
  entityType: TExtendedEntitiesTypeDict;
  CustomComponent: ({
    data,
    loading,
    error,
  }: {
    data?: R | null;
    loading?: boolean;
    error?: string | null;
  }) => JSX.Element;
}) {
  const [payload, setPayload] = useState<{
    entity: null | R;
    error: string | null;
    loading: boolean;
  } | null>(null);
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const entityConfig = getEntityByExtendedType({ type: entityType });

  useEffect(() => {
    async function getEntity() {
      setPayload({ entity: null, error: null, loading: true });
      if (entityConfig && entityConfig.api.query.one) {
        const { data, error } = await tryCatch<R, any>(
          // @ts-ignore
          entityConfig.api.query.one({ id: entityId, context: { virtualLabId, projectId } })
        );
        if (data) setPayload({ entity: data, error: null, loading: false });
        if (error) setPayload({ entity: null, error: 'error loading entity', loading: false });
      }
    }
    getEntity();
  }, [entityId, entityType, virtualLabId, projectId, entityConfig]);

  return (
    <CustomComponent loading={payload?.loading} error={payload?.error} data={payload?.entity} />
  );
}

export const renderTimestamp = (timestamp: Date) => {
  if (isValid(timestamp)) return formatDistanceToNow(timestamp, { addSuffix: true });
};

export function renderPreview<T extends EntityCoreResource>(
  resource: T,
  size?: { height?: number | string; width?: number | string },
  className?: string,
  rootClassName?: string,
  loadingClassName?: string,
  fill?: boolean,
  customRender?: (src: string) => ReactNode,
  target?: 'simulation' | 'stimulus'
) {
  return (
    <PreviewThumbnail
      resource={resource}
      width={size?.width}
      height={size?.height}
      className={className}
      rootClassName={rootClassName}
      loadingClassName={loadingClassName}
      fill={fill}
      target={target}
      customRender={customRender}
    />
  );
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
  const field = std
    ? `${renderFloatNumber(mean?.value)} ± ${renderFloatNumber(std?.value)}`
    : `${renderFloatNumber(mean?.value)}`;
  return <>{field}</>;
}

export function renderLocalizedNumber(
  value: number | null,
  options?: Intl.NumberFormatOptions
): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return EmptyValue;

  return new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/**
 * Renders a specific morphology measurement
 *
 * @param {ICellMorphologyExpanded} morphology
 * @param {string} structuralDomain - The compartment to serialize.
 * @param {string} label - The label to serialize.
 * @param {string} measurementType - The statistic to serialize.
 * @param {boolean} showUnits - Whether to show the units.
 *
 * @returns {string} - The rendered text value.
 */
export const renderMorphologyMeasurement = (
  morphology: ICellMorphologyExpanded | ICellMorphology,
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

// CONTRIBUTOR MODAL

function ContributorsModalTrigger({
  contributors,
}: {
  contributors: Array<IContributor>;
}): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button type="link" onClick={() => setIsOpen(true)} className="mt-2 h-auto p-0 text-gray-600">
        View {contributors.length} Contributor{contributors.length > 1 ? 's' : ''}
      </Button>
      {renderContributorsModal(contributors, isOpen, () => setIsOpen(false), 'modal')}
    </>
  );
}

export const renderContributorsModal = (
  contributors: Array<IContributor>,
  open: boolean,
  onClose: () => void,
  mode: 'modal' | 'inline' = 'modal'
): ReactNode => {
  const getName = (c: IContributor) =>
    ('givenName' in c.agent && c.agent.givenName) || c.agent.pref_label;

  const sortContributors = (a: IContributor, b: IContributor) => {
    return getName(a).localeCompare(getName(b));
  };

  const consortia = contributors
    .filter((c) => c.agent.type === 'consortium')
    .sort(sortContributors);
  const other = contributors.filter((c) => c.agent.type !== 'consortium').sort(sortContributors);

  const sortedContributors = [...consortia, ...other];

  if (mode === 'inline') {
    const displayContributors = sortedContributors.slice(0, 6);
    const hasMoreContributors = sortedContributors.length > 6;

    return (
      <div>
        <span className="line-clamp-2">
          {displayContributors.map((contributor, index) => (
            <span key={`${contributor.agent.pref_label}-${contributor.agent.type}`}>
              {getName(contributor)}
              {index < displayContributors.length - 1 ? ', ' : ''}
            </span>
          ))}
        </span>
        {hasMoreContributors && (
          <>
            {displayContributors.length > 0 && ' '}
            <ContributorsModalTrigger contributors={contributors} />
          </>
        )}
      </div>
    );
  }

  return (
    <Modal
      title="Contributors"
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={600}
      style={{
        color: 'var(--primary-8)',
        padding: '32px',
      }}
    >
      <p className="text-primary-8" style={{ margin: 0, fontSize: '18px' }}>
        {sortedContributors.map((contributor, index) => (
          <span key={`${contributor.agent.pref_label}-${contributor.agent.type}`}>
            {getName(contributor)}
            {index < sortedContributors.length - 1 ? ', ' : ''}
          </span>
        ))}
      </p>
    </Modal>
  );
};
