import isString from 'lodash/isString';

import type { ColumnsType } from 'antd/es/table';

import DefaultEModelTable from '@/components/build-section/cell-model-assignment/e-model/EModelView/DefaultEModelTable';
import ErrorMessageLine, {
  StandardFallback,
} from '@/components/build-section/cell-model-assignment/e-model/EModelView/ErrorMessageLine';
import Header from '@/components/build-section/cell-model-assignment/e-model/EModelView/Header';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getFieldsDefinition } from '@/entity-configuration/definitions';

import type { ICellMorphology, ICellMorphologyExpanded } from '@/api/entitycore/types';

const defaultColumnsFields = getFieldsDefinition([
  EntityCoreFields.Preview,
  EntityCoreFields.Name,
  EntityCoreFields.Description,
  EntityCoreFields.BrainRegion,
  EntityCoreFields.MType,
  EntityCoreFields.Contributions,
]);

const defaultColumns: ColumnsType<ICellMorphology> = Object.entries(defaultColumnsFields).map(
  ([key, field]) => ({
    title: isString(field.title) ? field.title.toUpperCase() : field.title,
    key,
    render: field.render,
  })
);

type Props = {
  exemplarMorphology: ICellMorphology | ICellMorphologyExpanded;
};

export default function ExemplarMorphology({ exemplarMorphology }: Props) {
  const exemplarMorphologyAsList = exemplarMorphology ? [exemplarMorphology] : [];
  const morphologies = exemplarMorphologyAsList;

  const columns = defaultColumns;

  let displayMorphologyError = null;

  const title = 'Exemplar morphology';

  if (!morphologies) {
    return <StandardFallback type="error">{title}</StandardFallback>;
  }

  if (exemplarMorphologyAsList.length > 0 && morphologies && morphologies.length !== 1) {
    if (morphologies.length > 1) {
      displayMorphologyError = 'Too many morphologies selected. Keep only one.';
    } else {
      displayMorphologyError = 'Select at least one morphology';
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Header>{title}</Header>

      <DefaultEModelTable<ICellMorphology> dataSource={morphologies || []} columns={columns} />

      <ErrorMessageLine message={displayMorphologyError} />
    </div>
  );
}
