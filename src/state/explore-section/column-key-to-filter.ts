import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';
import { getFieldDefinition } from '@/entity-configuration/definitions';

import type { CoreFilter } from '@/entity-configuration/definitions/types';

export default function columnKeyToFilter(key: EntityCoreFields): CoreFilter {
  const fieldConfig = getFieldDefinition(key);
  if (!fieldConfig) {
    return {
      field: key,
      type: CoreFieldFilterTypeEnum.Text,
      value: '',
    };
  }
  switch (fieldConfig.filter) {
    case CoreFieldFilterTypeEnum.CheckList:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.CheckList,
        value: [],
        constraint: fieldConfig.constraint,
      };
    case CoreFieldFilterTypeEnum.DateRange:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.DateRange,
        value: { gte: null, lte: null },
        constraint: fieldConfig.constraint,
      };
    case CoreFieldFilterTypeEnum.ValueRange:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.ValueRange,
        value: { gte: null, lte: null },
        constraint: fieldConfig.constraint,
      };
    case CoreFieldFilterTypeEnum.ValueOrRange:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.ValueOrRange,
        value: null,
        constraint: fieldConfig.constraint,
      };
    case CoreFieldFilterTypeEnum.Text:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.Text,
        value: '',
        constraint: fieldConfig.constraint,
      };
    default:
      return {
        field: key,
        type: null,
        value: null,
        constraint: fieldConfig.constraint,
      };
  }
}
