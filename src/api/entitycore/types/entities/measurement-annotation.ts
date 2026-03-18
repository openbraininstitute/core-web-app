import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { EntityCoreIdentifiable, Timestamps } from '@/api/entitycore/types/shared/global';
import type { PaginationFilter, TimestampsFilter } from '@/api/entitycore/types/shared/request';

type MeasurementItem = {
  name: string;
  unit: string;
  value: number;
};

export enum StructuralDomain {
  Axon = 'axon',
  Soma = 'soma',
  ApicalDendrite = 'apical_dendrite',
  BasalDendrite = 'basal_dendrite',
  NeuronMorphology = 'neuron_morphology',
}

export type MeasurementKind = {
  structural_domain: StructuralDomain;
  pref_label: string;
  measurement_items: MeasurementItem[];
};

export interface MeasurementAnnotation extends EntityCoreIdentifiable, Timestamps {
  entity_id: string;
  entity_type: TEntityTypeDict;
  measurement_kinds: MeasurementKind[];
}

// TODO: Extend with filters implemented in EntityCore
export type MeasurementAnnotationFilter = Partial<
  TimestampsFilter &
    PaginationFilter & {
      entity_id?: string;
      entity_type?: TEntityTypeDict;
    }
>;
