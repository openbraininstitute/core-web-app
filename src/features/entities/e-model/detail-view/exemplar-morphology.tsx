import isString from 'es-toolkit/compat/isString';
import Link from 'next/link';
import { useMemo } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getFieldsDefinition } from '@/entity-configuration/definitions';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import ErrorMessageLine, {
  StandardFallback,
} from '@/features/entities/e-model/detail-view/error-message-line';
import { Header } from '@/features/entities/e-model/detail-view/header';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { BaseTable } from '@/ui/segments/data-table/table';

import type { ColumnsType } from 'antd/es/table';
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
    width: key === EntityCoreFields.Preview ? '200px' : 'max-content',
  }));
}

type Props = {
  exemplarMorphology: ICellMorphology | ICellMorphologyExpanded;
};

export function ExemplarMorphology({ exemplarMorphology }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const exemplarMorphologyAsList = exemplarMorphology ? [exemplarMorphology] : [];
  const morphologies = exemplarMorphologyAsList;

  const columns = useMemo(() => makeColumns(virtualLabId, projectId), [virtualLabId, projectId]);

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
      <BaseTable
        size="small"
        wrapperClassname="h-full min-h-max "
        className="h-full [&_.ant-table-body]:max-h-full!"
        dataType={ExtendedEntitiesTypeDict.CellMorphology}
        dataSource={morphologies}
        rowKey="id"
        columns={columns}
        rowClassName="[&:last-child>td]:border-b-0!"
        scroll={{
          x: true,
        }}
      />
      <ErrorMessageLine message={displayMorphologyError} />
    </div>
  );
}
