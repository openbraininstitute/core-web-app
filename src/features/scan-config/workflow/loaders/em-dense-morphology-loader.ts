import { pick } from 'es-toolkit/compat';

import { getMEModels } from '@/api/entitycore/queries';
import { getCellMorphologies } from '@/api/entitycore/queries/experimental/cell-morphology';
import { searchDerivations } from '@/api/entitycore/queries/general/derivation';
import { DerivationType } from '@/api/entitycore/types/entities/derivation';
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE } from '@/constants';

import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';
import type {
  TBrowseListQueryFn,
  TBrowsePrerequisiteValue,
} from '@/ui/segments/workflows/browse/browse-config';

const SCOPE_FILTER_KEYS = ['authorized_public', 'authorized_project_id'] as const;

function readNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : fallback;
}

/** turns one page of derived cell-morphology ids into the rows the table renders */
type DerivedHydrate = (
  morphologyIds: string[],
  context: WorkspaceContext,
  scopeFilters: Partial<Record<(typeof SCOPE_FILTER_KEYS)[number], unknown>>
) => Promise<EntityCoreIdentifiableNamed[]>;

/**
 * shared builder for "rows derived from an EM dense reconstruction dataset" (the prerequisite)
 */
function buildDatasetDerivedLoader(hydrate: DerivedHydrate) {
  return (prerequisite: TBrowsePrerequisiteValue | null): TBrowseListQueryFn =>
    async ({ filters, context }) => {
      if (!prerequisite) {
        return undefined;
      }

      const page = readNumber(filters.page, DEFAULT_PAGE_NUMBER);
      const pageSize = readNumber(filters.page_size, DEFAULT_PAGE_SIZE);
      const scopeFilters = pick(filters, SCOPE_FILTER_KEYS);

      const derivations = await searchDerivations({
        context,
        filters: {
          derivation_type: DerivationType.EmDenseReconstructionDatasetCellMorphology.key,
          used__id: prerequisite.id,
          page,
          page_size: pageSize,
        },
      });

      const morphologyIds = derivations.data
        .map((derivation) => derivation.generated?.id)
        .filter((id): id is string => Boolean(id));

      const data =
        morphologyIds.length === 0 ? [] : await hydrate(morphologyIds, context, scopeFilters);

      return { data, pagination: derivations.pagination };
    };
}

export const buildEmDenseMorphologyLoader = buildDatasetDerivedLoader(
  async (morphologyIds, context, scopeFilters) => {
    if (morphologyIds.length === 0) {
      return [];
    }

    const morphologies = await getCellMorphologies({
      context,
      withFacets: false,
      filters: {
        ...scopeFilters,
        id__in: morphologyIds,
        page: DEFAULT_PAGE_NUMBER,
        page_size: morphologyIds.length,
      },
    });

    const byId = new Map(morphologies.data.map((row) => [row.id, row]));
    return morphologyIds
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }
);

export const buildMemodelLoader = buildDatasetDerivedLoader(
  async (morphologyIds, context, scopeFilters) => {
    if (morphologyIds.length === 0) {
      return [];
    }

    const memodels = await getMEModels({
      context,
      withFacets: false,
      filters: {
        ...scopeFilters,
        morphology__id__in: morphologyIds,
        page: DEFAULT_PAGE_NUMBER,
        page_size: morphologyIds.length,
      },
    });

    return memodels.data;
  }
);
