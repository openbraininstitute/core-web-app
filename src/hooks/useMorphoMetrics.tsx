import groupBy from 'es-toolkit/compat/groupBy';
import omit from 'es-toolkit/compat/omit';

import { fieldsDefinitionRegistry, getFieldDefinition } from '@/entity-configuration/definitions';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';
import { EmptyValue } from '@/entity-configuration/definitions/renderer';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { ICellMorphologyExpanded } from '@/api/entitycore/types/entities/cell-morphology';
import type { TypeSummaryProps } from '@/entity-configuration/definitions/view-defs/types';

export const useMorphometrics = (
  morphology: ICellMorphologyExpanded,
  showLabel: boolean = false,
  variant: 'light' | 'onPrimary' = 'light'
) => {
  const groupedCardFields = groupBy(
    getViewDefinitionByExtendedType(ExtendedEntitiesTypeDict.CellMorphology)!.cardViewFields,
    (item) => fieldsDefinitionRegistry[item.field]?.group ?? 'Metadata'
  );

  const filteredGroupedCardFields = omit(groupedCardFields, 'Metadata');

  const renderMetric = (field: TypeSummaryProps) => {
    if (!morphology) return null;

    const fieldObj = getFieldDefinition(field.field);

    return (
      <div
        className={variant === 'onPrimary' ? 'mr-10 text-white' : 'text-primary-8 mr-10'}
        key={field.field}
      >
        {showLabel && (
          <div
            className={
              variant === 'onPrimary' ? 'text-primary-3 uppercase' : 'text-neutral-4 uppercase'
            }
          >
            {fieldObj?.title}
          </div>
        )}
        <div className={`${showLabel ? 'mt-2' : 'mt-0 ml-6'}`}>
          <div className={`mb-2 h-6 truncate ${field.className}`}>
            {morphology ? fieldObj?.render?.(morphology) : EmptyValue}
          </div>
        </div>
      </div>
    );
  };

  return { groupedCardFields, filteredGroupedCardFields, renderMetric };
};
