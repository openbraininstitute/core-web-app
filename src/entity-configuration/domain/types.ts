import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { DataType } from '@/constants/explore-section/list-views';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export enum EntityType {
  AnalysisSoftwareSourceCode = 'analysis_software_source_code',
  Emodel = 'emodel',
  ExperimentalBoutonDensity = 'experimental_bouton_density',
  ExperimentalNeuronDensity = 'experimental_neuron_density',
  ExperimentalSynapsesPerConnection = 'experimental_synapses_per_connection',
  Memodel = 'memodel',
  Mesh = 'mesh',
  ReconstructionMorphology = 'reconstruction_morphology',
  SingleCellExperimentalTrace = 'single_cell_experimental_trace',
  SingleNeuronSimulation = 'single_neuron_simulation',
  SingleNeuronSynaptome = 'single_neuron_synaptome',
  SingleNeuronSynaptomeSimulation = 'single_neuron_synaptome_simulation',
  Subject = 'subject',
  SynapticPathway = 'synaptic_pathway',
}

export type EntityTypeUnion = keyof typeof EntityType;
export type EntityTypeValue = `${EntityType}`;

export type EntityCoreTypeConfig<T extends EntityCoreIdentifiable> = {
  group: 'experimental' | 'models' | 'simulations';
  legacyType?: DataType;
  type: EntityTypeValue;
  slug: string;
  api: {
    config: {
      allowedFacets?: boolean;
      allowedParams: 'all' | string[];
    };
    query: {
      list?: (query: any) => Promise<EntityCoreResponse<T>>;
      one?: (query: any) => Promise<any>;
    };
  };
  explore: {
    routePrefix?: string;
  };
  asset: {
    extension?: string;
  };
  viewDefinition?: ViewDefinitionConfig;
};
