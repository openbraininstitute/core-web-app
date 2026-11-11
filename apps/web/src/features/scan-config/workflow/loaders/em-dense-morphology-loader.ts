import { getMEModels } from '@/api/entitycore/queries';
import { getCellMorphologies } from '@/api/entitycore/queries/experimental/cell-morphology';
import { DerivationType } from '@/api/entitycore/types/entities/derivation';

import type { CellMorphologyFilter } from '@/api/entitycore/types/entities/cell-morphology';
import type { IMEModelFilter } from '@/api/entitycore/types/entities/me-model';
import type {
  TBrowseListQueryFn,
  TBrowsePrerequisiteValue,
} from '@/ui/segments/workflows/browse/browse-config';

const DATASET_MORPHOLOGY_DERIVATION = DerivationType.EmDenseReconstructionDatasetCellMorphology.key;

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
 * ME-models built on the dataset's morphologies, in one request: `GET /memodel` joins the
 * morphology's derivation, so paging/sorting/filters/facets are the endpoint's own.
 */
export const buildMemodelLoader =
  (prerequisite: TBrowsePrerequisiteValue | null): TBrowseListQueryFn =>
  async ({ filters, withFacets, context }) => {
    if (!prerequisite) {
      return undefined;
    }

    return getMEModels({
      context,
      withFacets,
      filters: {
        ...(filters as Partial<IMEModelFilter>),
        // after the spread so a grid filter can't override them
        morphology__generated_derivation__derivation_type: DATASET_MORPHOLOGY_DERIVATION,
        morphology__generated_derivation__used_id: prerequisite.id,
      },
    });
  };
