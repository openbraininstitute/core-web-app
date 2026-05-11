import { getFieldDefinition } from '@/entity-configuration/definitions';
import {
  CoreFieldFilterTypeEnum,
  type EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';
import { resolveFieldListing } from '@/entity-configuration/definitions/listing';

import type { TCoreFilter, TFieldApiContext } from '@/entity-configuration/definitions/types';

export function columnKeyToFilter(key: EntityCoreFields, context: TFieldApiContext): TCoreFilter {
  const fieldConfig = getFieldDefinition(key);
  if (!fieldConfig) {
    return {
      field: key,
      type: CoreFieldFilterTypeEnum.Text,
      value: '',
    };
  }

  const { constraint } = resolveFieldListing(fieldConfig, context);

  switch (fieldConfig.filter) {
    case CoreFieldFilterTypeEnum.CheckList:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.CheckList,
        value: [],
        constraint,
      };
    case CoreFieldFilterTypeEnum.DateRange:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.DateRange,
        value: { gte: null, lte: null },
        constraint,
      };
    case CoreFieldFilterTypeEnum.ValueRange:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.ValueRange,
        value: { gte: null, lte: null },
        constraint,
      };
    case CoreFieldFilterTypeEnum.ValueOrRange:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.ValueOrRange,
        value: null,
        constraint,
      };
    case CoreFieldFilterTypeEnum.Text:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.Text,
        value: '',
        constraint,
      };
    case CoreFieldFilterTypeEnum.DropdownList:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.DropdownList,
        value: null,
        constraint,
      };
    case CoreFieldFilterTypeEnum.Boolean:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.Boolean,
        value: null,
        constraint,
      };
    default:
      return {
        field: key,
        type: null,
        value: null,
        constraint,
      };
  }
}
