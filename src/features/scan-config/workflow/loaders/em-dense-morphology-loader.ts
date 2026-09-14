import { pick } from 'es-toolkit/compat';

import { getMEModels } from '@/api/entitycore/queries';
import { getCellMorphologies } from '@/api/entitycore/queries/experimental/cell-morphology';
import { searchDerivations } from '@/api/entitycore/queries/general/derivation';
import { DerivationType } from '@/api/entitycore/types/entities/derivation';
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE } from '@/constants';

import type { CellMorphologyFilter } from '@/api/entitycore/types/entities/cell-morphology';
import type {
  TBrowseListQueryFn,
  TBrowsePrerequisiteValue,
} from '@/ui/segments/workflows/browse/browse-config';

const SCOPE_FILTER_KEYS = ['authorized_public', 'authorized_project_id'] as const;

const DATASET_MORPHOLOGY_DERIVATION = DerivationType.EmDenseReconstructionDatasetCellMorphology.key;

function readNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * cell morphologies generated from the picked EM dense reconstruction dataset, in one request:
 * the derivation join lives on `GET /cell-morphology`, so paging/sorting/filtering are the
 * endpoint's own and stay consistent.
 */
export const buildEmDenseMorphologyLoader =
  (prerequisite: TBrowsePrerequisiteValue | null): TBrowseListQueryFn =>
  async ({ filters, withFacets, context }) => {
    if (!prerequisite) {
      return undefined;
    }

    return getCellMorphologies({
      context,
      withFacets,
      filters: {
        ...(filters as CellMorphologyFilter),
        generated_derivation__derivation_type: DATASET_MORPHOLOGY_DERIVATION,
        generated_derivation__used_id: prerequisite.id,
      },
    });
  };

/**
 * ME-models built on the dataset's morphologies. Still two requests: no derivation links a
 * dataset to an ME-model, and `GET /memodel` only filters morphologies by id.
 */
export const buildMemodelLoader =
  (prerequisite: TBrowsePrerequisiteValue | null): TBrowseListQueryFn =>
  async ({ filters, context }) => {
    if (!prerequisite) {
      return undefined;
    }

    const page = readNumber(filters.page, DEFAULT_PAGE_NUMBER);
    const pageSize = readNumber(filters.page_size, DEFAULT_PAGE_SIZE);

    const derivations = await searchDerivations({
      context,
      filters: {
        derivation_type: DATASET_MORPHOLOGY_DERIVATION,
        used__id: prerequisite.id,
        page,
        page_size: pageSize,
      },
    });

    const morphologyIds = derivations.data
      .map((derivation) => derivation.generated?.id)
      .filter((id): id is string => Boolean(id));

    if (morphologyIds.length === 0) {
      return { data: [], pagination: derivations.pagination };
    }

    const memodels = await getMEModels({
      context,
      withFacets: false,
      filters: {
        ...pick(filters, SCOPE_FILTER_KEYS),
        morphology__id__in: morphologyIds,
        page: DEFAULT_PAGE_NUMBER,
        page_size: morphologyIds.length,
      },
    });

    return { data: memodels.data, pagination: derivations.pagination };
  };
