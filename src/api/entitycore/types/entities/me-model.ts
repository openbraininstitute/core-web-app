import z from 'zod';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';

import type {
  EntityCoreIdentifiable,
  EntityAuthorization,
  IBrainRegion,
  IContributor,
  Timestamps,
  ISpecies,
  IStrain,
  IEType,
  IMType,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IMorphologyFilter,
  BrainRegionFilter,
  IEModelFilter,
  SpeciesFilter,
  SharedFilter,
  MtypeFilter,
  EtypeFilter,
} from '@/api/entitycore/types/shared/request';
import type { IEModelBase } from '@/api/entitycore/types/entities/e-model';
import type { IReconstructionMorphologyBase } from '@/api/entitycore/types/entities/reconstruction-morphology';

export enum ValidationStatus {
  Created = 'created',
  Initialized = 'initialized',
  Running = 'running',
  Done = 'done',
  Error = 'error',
}

export interface IMEModelBase {
  name: string;
  description: string;
  validation_status: ValidationStatus;
}

export interface IMEModel
  extends EntityCoreIdentifiable,
    IMEModelBase,
    Timestamps,
    EntityAuthorization {
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
  contributions?: Array<IContributor> | null;
  mtypes: Array<IMType> | null;
  etypes: Array<IEType> | null;
  morphology: IReconstructionMorphologyBase;
  emodel: IEModelBase;
  type: EntityTypeEnum.Memodel;
}

export interface IMEModelFilter
  extends ContributionFilter,
    MtypeFilter,
    EtypeFilter,
    SpeciesFilter,
    BrainRegionFilter,
    IMorphologyFilter,
    IEModelFilter,
    SharedFilter {
  score__lte: number | null;
  score__gte: number | null;
  type: EntityTypeEnum.Emodel;
  validation_status: ValidationStatus;
}

export const CreateMEModelSchema = z.object({
  name: z.string(),
  description: z.string(),
  validation_status: z.nativeEnum(ValidationStatus),
  brain_region_id: z.number(),
  morphology_id: z.string().uuid(),
  emodel_id: z.string().uuid(),
  species_id: z.string().uuid(),
  strain_id: z.string().uuid().nullable(),
});

export type TCreateMEModel = z.infer<typeof CreateMEModelSchema>;
