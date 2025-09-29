import isNumber from 'lodash/isNumber';
import isEmpty from 'lodash/isEmpty';

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
      return isNumber(filter.value.gte) || isNumber(filter.value.lte);
    case CoreFieldFilterTypeEnum.WithinList:
      return false; // TODO: this is need to be discussed/fixed
    case CoreFieldFilterTypeEnum.ValueOrRange:
      if (!filter.value) {
        return false;
      }
      return !!(isNumber(filter.value) || filter.value.gte || filter.value.lte);
    default:
      return !!filter.value;
  }
}
