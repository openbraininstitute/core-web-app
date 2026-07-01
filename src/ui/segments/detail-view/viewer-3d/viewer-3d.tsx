'use client';

import { CellMorphologyViewer } from '@/features/entities/cell-morphology/detail-view';
import { MeshViewer } from '@/features/entities/em-cell-mesh/mesh-viewer';
import useWorkspace from '@/ui/hooks/use-workspace';

import { useTypeChecker } from './hooks';

import type { ICellMorphology } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';

import styles from './viewer-3d.module.css';

export default function Viewer3D({
  extendedType,
  entity,
}: {
  entity?: TRetrieveEntityOutput;
  extendedType: TExtendedEntitiesTypeDict;
}) {
  const isType = useTypeChecker(extendedType);
  const context = useWorkspace();

  if (isType('EMCellMesh')) {
    return <MeshViewer meshId={entity?.id} />;
  }
  if (isType('CellMorphology', 'ComputationallySynthesizedCellMorphology')) {
    return <CellMorphologyViewer entity={entity as ICellMorphology} context={context} />;
  }
  return <div className={styles.cominSoon}>Coming soon...</div>;
}
