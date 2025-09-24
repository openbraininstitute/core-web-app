import { Atom, atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

import { pageNumberAtom, pageSizeAtom } from '@/state/explore-section/list-view-atoms';
import { DerivationTypeDictionary } from '@/api/entitycore/types/entities/derivation';
import { getEntityDerivations } from '@/api/entitycore/queries/general/derivation';
import { getElectricalCellRecordings } from '@/api/entitycore/queries';
import { tryCatch } from '@/api/utils';

import type { IElectricalCellRecording } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

export const experimentalTracesAtomFamily = atomFamily<
  WorkspaceContext & { id: string; key: string },
  Atom<Promise<{ error: Error | null; data?: IElectricalCellRecording[] | null; total: number }>>
>(
  (ctx) =>
    atom(async (get) => {
      const pageNumber = get(pageNumberAtom(ctx.key));
      const pageSize = get(pageSizeAtom({ key: ctx.key, defaultSize: 5 }));
      const { data, error } = await tryCatch(
        getEntityDerivations({
          context: { virtualLabId: ctx.virtualLabId, projectId: ctx.projectId },
          entityId: ctx.id,
          entityRoute: 'emodel',
          filters: {
            derivation_type: DerivationTypeDictionary.Unspecified,
            page: pageNumber,
            page_size: pageSize,
          },
        })
      );
      if (error) {
        return {
          error,
          data: null,
          total: 0,
        };
      }
      const { data: emodels, error: emodelsError } = await tryCatch(
        getElectricalCellRecordings({
          context: { virtualLabId: ctx.virtualLabId, projectId: ctx.projectId },
          filters: { id__in: data?.data.map((o) => o.id).join(',') },
          withFacets: false,
        })
      );
      if (emodelsError) {
        return {
          data: null,
          error: emodelsError,
          total: 0,
        };
      }
      return {
        data: emodels?.data,
        error: null,
        total: data.pagination.total_items,
      };
    }),
  (a, b) => a.key === b.key
);
