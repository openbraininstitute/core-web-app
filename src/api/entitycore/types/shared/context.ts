import find from 'lodash/find';

import * as entitycore from '@/api/entitycore/queries';
import { DataType } from '@/constants/explore-section/list-views';
import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';

type EntityCoreMapper = {
  group: 'experimental' | 'models' | 'simulations';
  legacyType?: DataType;
  type: string;
  slug: string;
  assetExtension: string;
  allowedFacets?: boolean;
  allowedParams: string | string[];
  exploreRoutePrefix?: string;
  queryAll?: (query: any) => Promise<EntityCoreResponse<any>>;
  queryOne?: (query: any) => Promise<any>;
};

// TODO: NOTE: this is the basic mapper for the entity core.
// TODO: NOTE: we need to extend this mapper for the new entity core types.
// TODO: NOTE: all relative information as fields, filters, ... should be placed here when we migrate completely from nexus

const ENTITY_CORE_EXPERIMENTAL: Record<string, EntityCoreMapper> = {
  RECONSTRUCTION_MORPHOLOGY: {
    group: 'experimental',
    legacyType: DataType.ExperimentalNeuronMorphology,
    type: 'reconstruction-morphology',
    slug: 'morphology',
    exploreRoutePrefix: 'interactive/experimental',
    assetExtension: 'application/swc',
    allowedFacets: true,
    allowedParams: 'all',
    queryAll: entitycore.getReconstructionMorphologies,
    queryOne: entitycore.getReconstructionMorphology,
  },
  EXPERIMENTAL_BOUTON_DENSITY: {
    group: 'experimental',
    legacyType: DataType.ExperimentalBoutonDensity,
    type: 'experimental-bouton-density',
    slug: 'bouton-density',
    exploreRoutePrefix: 'interactive/experimental',
    assetExtension: 'application/json',
    allowedFacets: undefined,
    allowedParams: ['page_size', 'page'],
    queryAll: entitycore.getExperimentalBoutonDensities,
    queryOne: entitycore.getExperimentalBoutonDensity,
  },
  EXPERIMENTAL_NEURON_DENSITY: {
    group: 'experimental',
    legacyType: DataType.ExperimentalNeuronDensity,
    type: 'experimental-neuron-density',
    slug: 'neuron-density',
    exploreRoutePrefix: 'interactive/experimental',
    assetExtension: 'application/json',
    allowedFacets: undefined,
    allowedParams: ['page_size', 'page'],
    queryAll: entitycore.getExperimentalNeuronDensities,
    queryOne: entitycore.getExperimentalNeuronDensity,
  },
  EXPERIMENTAL_SYNAPSES_PER_CONNECTION: {
    group: 'experimental',
    legacyType: DataType.ExperimentalSynapsePerConnection,
    type: 'experimental-synapses-per-connection',
    slug: 'synapse-per-connection',
    exploreRoutePrefix: 'interactive/experimental',
    assetExtension: 'application/json',
    allowedFacets: undefined,
    allowedParams: ['page_size', 'page'],
    queryAll: entitycore.getExperimentalSynapsesPerConnections,
    queryOne: entitycore.getExperimentalSynapsesPerConnection,
  },
  EXPERIMENTAL_ELECTROPHYSIOLOGY: {
    group: 'experimental',
    legacyType: DataType.ExperimentalElectroPhysiology,
    type: 'single-cell-experimental-trace',
    slug: 'electrophysiology',
    exploreRoutePrefix: 'interactive/experimental',
    assetExtension: 'application/json',
    allowedFacets: undefined,
    allowedParams: ['page_size', 'page'],
    queryAll: undefined,
    queryOne: undefined,
  },
} as const;

const ENTITY_CORE_MODEL: Record<string, EntityCoreMapper> = {
  MESH: {
    group: 'models',
    legacyType: undefined,
    type: 'mesh',
    slug: 'mesh',
    exploreRoutePrefix: 'model',
    assetExtension: 'application/json',
    allowedFacets: undefined,
    allowedParams: ['page_size', 'page'],
    queryAll: undefined,
    queryOne: undefined,
  },
  EMODEL: {
    group: 'models',
    legacyType: DataType.CircuitEModel,
    type: 'emodel',
    slug: 'e-model',
    exploreRoutePrefix: 'model',
    assetExtension: 'application/json',
    allowedFacets: undefined,
    allowedParams: ['page_size', 'page'],
    queryAll: undefined,
    queryOne: undefined,
  },
} as const;

export const ENTITY_CORE_MAPPER: Record<string, EntityCoreMapper> = {
  ...ENTITY_CORE_EXPERIMENTAL,
  ...ENTITY_CORE_MODEL,
} as const;

export type EntityCoreLegacyType =
  (typeof ENTITY_CORE_MAPPER)[keyof typeof ENTITY_CORE_MAPPER]['legacyType'];

export const getEntityByLegacyType = ({ legacyType }: { legacyType: EntityCoreLegacyType }) =>
  find(ENTITY_CORE_MAPPER, { legacyType });

export const getEntityBySlug = ({ slug }: { slug: string }) => find(ENTITY_CORE_MAPPER, { slug });
