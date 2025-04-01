import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import isNil from 'lodash/isNil';
import isEmpty from 'lodash/isEmpty';

import PreviewThumbnail from '@/features/thumbnail/preview';
import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';

export const renderEmptyOrValue = (value: any) => {
  return isNil(value) || isEmpty(value) ? '—' : value;
};

export const renderArray = (array: string[]) => {
  return array.map((item) => <div key={item}>{item}</div>);
};

export const renderDate = (isoDateString: string) => {
  if (!isoDateString) return '—';
  return format(parseISO(isoDateString), 'dd.MM.yyyy');
};

export const renderTimestamp = (timestamp: string) => {
  if (isValid(timestamp)) return formatDistanceToNow(timestamp, { addSuffix: true });
};

export function renderPreview<T>(
  resource: T & EntityCoreResource,
  size?: { height: number; width: number } | string
) {
  return <PreviewThumbnail resource={resource} size={size} />;
}
