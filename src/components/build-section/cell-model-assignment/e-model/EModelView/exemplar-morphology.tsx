import { useState } from 'react';
import type { ColumnsType } from 'antd/es/table';

import DefaultEModelTable from './DefaultEModelTable';
import Header from './Header';
import ErrorMessageLine, { StandardFallback } from './ErrorMessageLine';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getFieldsDefinition } from '@/entity-configuration/definitions';

import type {
  IReconstructionMorphology,
  IReconstructionMorphologyExpanded,
} from '@/api/entitycore/types';

const defaultColumnsFields = getFieldsDefinition([
  EntityCoreFields.Preview,
  EntityCoreFields.Name,
  EntityCoreFields.Description,
  EntityCoreFields.BrainRegion,
  EntityCoreFields.MType,
  EntityCoreFields.Contributions,
]);

const defaultColumns: ColumnsType<IReconstructionMorphology> = Object.entries(
  defaultColumnsFields
).map(([key, field]) => ({
  title: field.title.toUpperCase(),
  key,
  render: field.render,
}));

type Props = {
  exemplarMorphology: IReconstructionMorphology | IReconstructionMorphologyExpanded;
};

export default function ExemplarMorphology({ exemplarMorphology }: Props) {
  const [openPicker, setOpenPicker] = useState(false);

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

      <DefaultEModelTable<IReconstructionMorphology>
        dataSource={morphologies || []}
        columns={columns}
      />

      <ErrorMessageLine message={displayMorphologyError} />
    </div>
  );
}
