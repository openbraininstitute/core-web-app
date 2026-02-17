import { z } from 'zod';

import type {
  TCircuitBuildCategoryDictionary,
  TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreType,
  IContributor,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IEntityFilter,
  IlikeSearchFilter,
  NameFilter,
  PaginationFilter,
} from '@/api/entitycore/types/shared/request';

interface ICircuitExtractionConfigBase {
  name: string;
  description: string;
  circuit_id: string;
  scan_parameters: Record<string, unknown>;
}

export interface ICircuitExtractionConfig
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    ICircuitExtractionConfigBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType {
  contributions?: Array<IContributor> | null;
}

export interface ICircuitExtractionConfigCircuitFilter {
  circuit_id?: string | null;
  circuit_id__in?: Array<string> | null;
  circuit_extraction_campaign_id?: string | null;
  circuit_extraction_campaign_id__in?: Array<string> | null;
  circuit__scale?: TCircuitScaleDictionary | null;
  circuit__scale__in?: Array<TCircuitScaleDictionary> | null;
  circuit__build_category?: TCircuitBuildCategoryDictionary | null;
  circuit__build_category__in?: Array<TCircuitBuildCategoryDictionary> | null;
  circuit__name?: string | null;
  circuit__name__in?: Array<string> | null;
  circuit__name__ilike?: string | null;
  circuit__id?: string | null;
  circuit__id__in?: Array<string> | null;
}

export interface ICircuitExtractionConfigFilter
  extends IEntityFilter,
    NameFilter,
    PaginationFilter,
    IlikeSearchFilter,
    ContributionFilter,
    ICircuitExtractionConfigCircuitFilter {}

const CreateCircuitExtractionConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  circuit_id: z.string().uuid(),
  scan_parameters: z.record(z.string(), z.unknown()),
  authorized_public: z.boolean().default(false),
});

export type TCreateCircuitExtractionConfig = z.infer<typeof CreateCircuitExtractionConfigSchema>;

const UpdateCircuitExtractionConfigSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  circuit_id: z.string().uuid().optional(),
  scan_parameters: z.record(z.string(), z.unknown()).optional(),
});

export type TUpdateCircuitExtractionConfig = z.infer<typeof UpdateCircuitExtractionConfigSchema>;
