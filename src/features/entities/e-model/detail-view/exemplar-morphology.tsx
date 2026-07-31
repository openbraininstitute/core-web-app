import isString from 'es-toolkit/compat/isString';
import Link from 'next/link';
import { useMemo } from 'react';

import { type TViewVariant, ViewVariant } from '@/constants';
import { getFieldsDefinition } from '@/entity-configuration/definitions';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import ErrorMessageLine, {
  StandardFallback,
} from '@/features/entities/e-model/detail-view/error-message-line';
import { Header } from '@/features/entities/e-model/detail-view/header';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { detailViewInsetPanelClass } from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type {
  EntityCoreObjectTypes,
  ICellMorphology,
  ICellMorphologyExpanded,
} from '@/api/entitycore/types';
import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';

const defaultColumnsFields = getFieldsDefinition([
  EntityCoreFields.Preview,
  EntityCoreFields.Name,
  EntityCoreFields.Description,
  EntityCoreFields.BrainRegion,
  EntityCoreFields.MType,
  EntityCoreFields.Contributions,
]);

function makeColumns(
  virtualLabId: string,
  projectId: string
): Array<SimpleColumn<ICellMorphology>> {
  return Object.entries(defaultColumnsFields).map(([key, field]) => ({
    id: key,
    // legacy uppercased string titles; a rich (ReactNode) title becomes a headerNode
    header: isString(field.title) ? field.title.toUpperCase() : key,
    headerNode: isString(field.title) ? undefined : field.title,
    // preview keeps its fixed width; other columns size to content (legacy 'max-content')
    width: key === EntityCoreFields.Preview ? { width: 200 } : undefined,
    renderCell: (entity) => {
      const href = `/app/virtual-lab/${virtualLabId}/${projectId}/data/view/cell-morphology/${
        entity.id
      }/overview`;
      return <Link href={href}>{field.render?.(entity as EntityCoreObjectTypes)}</Link>;
    },
  }));
}

type Props = {
  exemplarMorphology: ICellMorphology | ICellMorphologyExpanded;
  variant?: TViewVariant;
};

export function ExemplarMorphology({ exemplarMorphology, variant = ViewVariant.Light }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const exemplarMorphologyAsList = exemplarMorphology ? [exemplarMorphology] : [];
  const morphologies = exemplarMorphologyAsList;

  const columns = useMemo(() => makeColumns(virtualLabId, projectId), [virtualLabId, projectId]);

  let displayMorphologyError = null;

  const title = 'Exemplar morphology';

  if (!morphologies) {
    return (
      <StandardFallback type="error" variant={variant}>
        {title}
      </StandardFallback>
    );
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
      <Header variant={variant}>{title}</Header>
      <div className={cn(detailViewInsetPanelClass(variant))}>
        <SimpleGrid<ICellMorphology>
          rows={morphologies}
          columns={columns}
          getRowId={(row) => row.id}
        />
      </div>
      <ErrorMessageLine message={displayMorphologyError} />
    </div>
  );
}
