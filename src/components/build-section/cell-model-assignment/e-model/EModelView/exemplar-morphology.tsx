import React from 'react';
import isString from 'es-toolkit/compat/isString';
import Link from 'next/link';
import type { ColumnsType } from 'antd/es/table';

import { useWorkspace } from '@/ui/hooks/use-workspace';
import DefaultEModelTable from '@/components/build-section/cell-model-assignment/e-model/EModelView/DefaultEModelTable';
import ErrorMessageLine, {
  StandardFallback,
} from '@/components/build-section/cell-model-assignment/e-model/EModelView/ErrorMessageLine';
import Header from '@/components/build-section/cell-model-assignment/e-model/EModelView/Header';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getFieldsDefinition } from '@/entity-configuration/definitions';

import type {
  EntityCoreObjectTypes,
  ICellMorphology,
  ICellMorphologyExpanded,
} from '@/api/entitycore/types';

const defaultColumnsFields = getFieldsDefinition([
  EntityCoreFields.Preview,
  EntityCoreFields.Name,
  EntityCoreFields.Description,
  EntityCoreFields.BrainRegion,
  EntityCoreFields.MType,
  EntityCoreFields.Contributions,
]);

function makeColumns(virtualLabId: string, projectId: string): ColumnsType<ICellMorphology> {
  return Object.entries(defaultColumnsFields).map(([key, field]) => ({
    title: isString(field.title) ? field.title.toUpperCase() : field.title,
    key,
    render: (entity: EntityCoreObjectTypes) => {
      const href = `/app/virtual-lab/${virtualLabId}/${projectId}/data/view/cell-morphology/${
        entity.id
      }/overview`;
      return <Link href={href}>{field.render?.(entity)}</Link>;
    },
  }));
}

type Props = {
  exemplarMorphology: ICellMorphology | ICellMorphologyExpanded;
};

export default function ExemplarMorphology({ exemplarMorphology }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const exemplarMorphologyAsList = exemplarMorphology ? [exemplarMorphology] : [];
  const morphologies = exemplarMorphologyAsList;

  const columns = React.useMemo(
    () => makeColumns(virtualLabId, projectId),
    [virtualLabId, projectId]
  );

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
