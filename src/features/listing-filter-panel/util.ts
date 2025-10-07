import isEmpty from 'es-toolkit/compat/isEmpty';
import isArray from 'es-toolkit/compat/isArray';
import isNil from 'es-toolkit/compat/isNil';

import { CoreFieldFilterTypeEnum } from '@/entity-configuration/definitions/fields-defs/enums';

import type { CoreFilter } from '@/entity-configuration/definitions/types';

/**
 * Checks whether the filter has a value assigned
 *
 * @param filter the filter to check
 */
export function filterHasValue(filter: CoreFilter) {
  switch (filter.type) {
    case CoreFieldFilterTypeEnum.Text:
      return !isEmpty(filter.value);
    case CoreFieldFilterTypeEnum.CheckList:
      return filter.value.length !== 0;
    case CoreFieldFilterTypeEnum.DateRange:
      return !isEmpty(filter.value.gte) || !isEmpty(filter.value.lte);
    case CoreFieldFilterTypeEnum.ValueRange:
      return !isNil(filter.value.gte) || !isNil(filter.value.lte);
    case CoreFieldFilterTypeEnum.WithinList:
      return false; // TODO: this is need to be discussed/fixed
    case CoreFieldFilterTypeEnum.ValueOrRange:
      if (!filter.value) {
        return false;
      }
      return true;
    case CoreFieldFilterTypeEnum.DropdownList:
      if (filter.value) {
        if (typeof filter.value === 'string' && filter.value.trim() !== '') return true;
        if (isArray(filter.value) && filter.value.length > 0) return true;
      }
      return false;
    default:
      return !!filter.value;
  }
}
