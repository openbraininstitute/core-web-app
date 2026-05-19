import { getCellMorphology, getEmCellMesh } from '@/api/entitycore/queries';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { EntityTypeDict } from '@/api/entitycore/types';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ICellMorphology } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEMCellMesh } from '@/api/entitycore/types/entities/em-cell-mesh';
import type { TEntityRouteQuery } from '@/features/scan-config/workflow/types';

export const scanConfigEntityQueries = {
  circuit: {
    queryKey: ({ context, id }) =>
      keyBuilder.oneCircuit({
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        entityId: id,
      }),
    queryFn: ({ context, id }) => getCircuit({ id, context }),
  } satisfies TEntityRouteQuery<ICircuit>,

  emCellMesh: {
    queryKey: ({ context, id }) =>
      keyBuilder.entity({
        context,
        id,
        type: EntityTypeDict.EMCellMesh,
      }),
    queryFn: ({ context, id }) => getEmCellMesh({ id, context }),
  } satisfies TEntityRouteQuery<IEMCellMesh>,

  cellMorphology: {
    queryKey: ({ context, id }) =>
      keyBuilder.entity({
        context,
        id,
        type: EntityTypeDict.CellMorphology,
      }),
    queryFn: ({ context, id }) => getCellMorphology({ id, context }),
  } satisfies TEntityRouteQuery<ICellMorphology>,
} as const;
