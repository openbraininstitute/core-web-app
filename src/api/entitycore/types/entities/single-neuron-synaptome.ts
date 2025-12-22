import isNil from 'es-toolkit/compat/isNil';
import { z } from 'zod';
import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type { IMEModel, IMEModelFilter } from '@/api/entitycore/types/entities/me-model';
import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  IContributor,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionFilter,
  ContributionFilter,
  EtypeFilter,
  MtypeFilter,
  OwnershipFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';
import { validateSingleNeuronSynapseGenerationFormula } from '@/api/small-scale-simulator';

export interface SingleNeuronSynaptomeBase {
  name: string;
  description: string;
  seed: number;
}

export interface ISingleNeuronSynaptome
  extends EntityCoreIdentifiable,
    EntityAuthorization,
    SingleNeuronSynaptomeBase,
    Timestamps,
    EntityCoreOwnership,
    EntityCoreType,
    EntityCoreBaseAsset {
  contributions?: IContributor[] | null;
  brain_region: BrainRegionHierarchyBase;
  me_model: IMEModel;
}

export interface ISingleNeuronSynaptomeFilter
  extends ContributionFilter,
    MtypeFilter,
    EtypeFilter,
    BrainRegionFilter,
    SharedFilter,
    IMEModelFilter,
    PaginationFilter,
    OwnershipFilter {}

const CreateSingleNeuronSynaptomeSchema = z.object({
  name: z.string(),
  description: z.string(),
  brain_region_id: z.number(),
  me_model_id: z.string().uuid(),
  seed: z.number(),
});

export type TCreateSingleNeuronSynaptome = z.infer<typeof CreateSingleNeuronSynaptomeSchema>;

const SingleNeuronSynaptomeExclusionRuleSchema = z
  .object({
    id: z.string().uuid(),
    distance_soma_gte: z.number().nullish(),
    distance_soma_lte: z.number().nullish(),
  })
  .refine(
    (data) => {
      if (isNil(data.distance_soma_gte) && isNil(data.distance_soma_lte)) return false;
      return true;
    },
    {
      message: 'At least one of distance_soma_gte or distance_soma_lte must be provided',
      path: ['distance_soma_gte', 'distance_soma_lte'],
    }
  );

export const SingleNeuronSynaptomeBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nonempty(),
  target: z.string().optional(),
  seed: z.number(),
  color: z.string().optional(),
  formula: z.string().optional(),
  soma_synapse_count: z.number().optional(),
  type: z.union([z.literal(110), z.literal(10)]),
  exclusion_rules: z.array(SingleNeuronSynaptomeExclusionRuleSchema).nullable(),
});

export const SingleNeuronSynaptomeConfigurationSchema = SingleNeuronSynaptomeBaseSchema.superRefine(
  (synapse, ctx) => {
    if (synapse.target !== 'soma' && isNil(synapse.formula)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'formula should be provided when target is different then "soma"',
        path: ['formula'],
      });
    }
    if (synapse.target === 'soma' && isNil(synapse.soma_synapse_count)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'soma_synapse_count must be a valid number when target is "soma"',
        path: ['soma_synapse_count'],
      });
    }
  }
).superRefine(async (synapse, ctx) => {
  if (synapse.target !== 'soma') {
    const v = await validateSingleNeuronSynapseGenerationFormula(synapse.formula!);
    if (!v) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'formula is not valid',
        path: ['formula'],
      });
    }
  }
});

export type TSingleNeuronSynaptomeConfiguration = z.infer<
  typeof SingleNeuronSynaptomeConfigurationSchema
>;
