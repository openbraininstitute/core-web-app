import find from 'lodash/find';

import * as entitycore from '@/api/entitycore/queries';
import { DataType } from '@/constants/explore-section/list-views';
import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';

type EntityCoreMapper = {
  legacyType?: DataType;
  type: string;
  assetExtension: string;
  allowedFacets?: boolean;
  allowedParams: string | string[];
  queryAll?: (query: any) => Promise<EntityCoreResponse<any>>;
  queryOne?: (query: any) => Promise<any>;
};

// TODO: NOTE: this is the basic mapper for the entity core.
// TODO: NOTE: we need to extend this mapper for the new entity core types.
// TODO: NOTE: all relative information as fields, filters, ... should be placed here when we migrate completely from nexus

export const ENTITY_CORE_MAPPER: Record<string, EntityCoreMapper> = {
  RECONSTRUCTION_MORPHOLOGY: {
    legacyType: DataType.ExperimentalNeuronMorphology,
    type: 'reconstruction-morphology',
    assetExtension: 'application/swc',
    allowedFacets: true,
    allowedParams: 'all',
    queryAll: entitycore.getReconstructionMorphologies,
    queryOne: entitycore.getReconstructionMorphology,
  },
  EXPERIMENTAL_BOUTON_DENSITY: {
    legacyType: DataType.ExperimentalBoutonDensity,
    type: 'experimental-bouton-density',
    assetExtension: 'application/json',
    allowedFacets: undefined,
    allowedParams: ['page_size', 'page'],
    queryAll: entitycore.getExperimentalBoutonDensities,
    queryOne: entitycore.getExperimentalBoutonDensity,
  },
  EXPERIMENTAL_NEURON_DENSITY: {
    legacyType: DataType.ExperimentalNeuronDensity,
    type: 'experimental-neuron-density',
    assetExtension: 'application/json',
    allowedFacets: undefined,
    allowedParams: ['page_size', 'page'],
    queryAll: entitycore.getExperimentalNeuronDensities,
    queryOne: entitycore.getExperimentalNeuronDensity,
  },
  EXPERIMENTAL_SYNAPSES_PER_CONNECTION: {
    legacyType: DataType.ExperimentalSynapsePerConnection,
    type: 'experimental-synapses-per-connection',
    assetExtension: 'application/json',
    allowedFacets: undefined,
    allowedParams: ['page_size', 'page'],
    queryAll: entitycore.getExperimentalSynapsesPerConnections,
    queryOne: entitycore.getExperimentalSynapsesPerConnection,
  },
  MESH: {
    legacyType: undefined,
    type: 'mesh',
    assetExtension: 'application/json',
    allowedFacets: undefined,
    allowedParams: ['page_size', 'page'],
    queryAll: undefined,
    queryOne: undefined,
  },
  EMODEL: {
    legacyType: DataType.CircuitEModel,
    type: 'emodel',
    assetExtension: 'application/json',
    allowedFacets: undefined,
    allowedParams: ['page_size', 'page'],
    queryAll: undefined,
    queryOne: undefined,
  },
  SINGLE_CELL_EXPERIMENTAL_TRACE: {
    legacyType: DataType.ExperimentalElectroPhysiology,
    type: 'single-cell-experimental-trace',
    assetExtension: 'application/json',
    allowedFacets: undefined,
    allowedParams: ['page_size', 'page'],
    queryAll: undefined,
    queryOne: undefined,
  },
} as const;

export type EntityCoreLegacyType =
  (typeof ENTITY_CORE_MAPPER)[keyof typeof ENTITY_CORE_MAPPER]['legacyType'];

export const getEntityByLegacyType = (legacyType: EntityCoreLegacyType) =>
  find(ENTITY_CORE_MAPPER, { legacyType });
