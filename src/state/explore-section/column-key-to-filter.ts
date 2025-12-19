import get from 'es-toolkit/compat/get';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import {
  CoreFieldFilterTypeEnum,
  type EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';
import type { TCoreFilter } from '@/entity-configuration/definitions/types';

export default function columnKeyToFilter(
  key: EntityCoreFields,
  dataType: TExtendedEntitiesTypeDict,
): TCoreFilter {
  const fieldConfig = getFieldDefinition(key);
  if (!fieldConfig) {
    return {
      field: key,
      type: CoreFieldFilterTypeEnum.Text,
      value: '',
    };
  }
  const constraint = get(fieldConfig.perTypeConstraint, dataType);
  switch (fieldConfig.filter) {
    case CoreFieldFilterTypeEnum.CheckList:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.CheckList,
        value: [],
        constraint: constraint ?? fieldConfig.defaultConstraint,
      };
    case CoreFieldFilterTypeEnum.DateRange:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.DateRange,
        value: { gte: null, lte: null },
        constraint: constraint ?? fieldConfig.defaultConstraint,
      };
    case CoreFieldFilterTypeEnum.ValueRange:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.ValueRange,
        value: { gte: null, lte: null },
        constraint: constraint ?? fieldConfig.defaultConstraint,
      };
    case CoreFieldFilterTypeEnum.ValueOrRange:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.ValueOrRange,
        value: null,
        constraint: constraint ?? fieldConfig.defaultConstraint,
      };
    case CoreFieldFilterTypeEnum.Text:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.Text,
        value: '',
        constraint: constraint ?? fieldConfig.defaultConstraint,
      };
    case CoreFieldFilterTypeEnum.DropdownList:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.DropdownList,
        value: null,
        constraint: constraint ?? fieldConfig.defaultConstraint,
      };
    case CoreFieldFilterTypeEnum.Boolean:
      return {
        field: key,
        type: CoreFieldFilterTypeEnum.Boolean,
        value: null,
        constraint: constraint ?? fieldConfig.defaultConstraint,
      };
    default:
      return {
        field: key,
        type: null,
        value: null,
        constraint: constraint ?? fieldConfig.defaultConstraint,
      };
  }
}
