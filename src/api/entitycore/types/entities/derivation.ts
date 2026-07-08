import { uniq } from 'es-toolkit/compat';

import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { EntityCoreIdentifiable, EntityCoreType } from '@/api/entitycore/types/shared/global';
import type {
  EntityCoreTypeFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';

/**
 * Represents the type of derivation relationship between two entities.
 *
 * - circuit_customization: The entity was derived by customizing a circuit.
 * - circuit_extraction: The entity was derived by extracting nodes from a circuit.
 * - circuit_rewiring: The entity was derived by rewiring a circuit's connectivity.
 * - emodel_circuit: The entity was derived from an e-model circuit.
 * - em_dense_reconstruction_dataset_cell_morphology: A cell morphology derived from an EM
 *   dense reconstruction dataset (used to list a dataset's neurons).
 * - unspecified: A derivation that does not require a specific type.
 */
export const DerivationType = {
  CircuitCustomization: {
    key: 'circuit_customization',
    label: 'Circuit customization',
  },
  CircuitExtraction: {
    key: 'circuit_extraction',
    label: 'Circuit extraction',
  },
  CircuitRewiring: {
    key: 'circuit_rewiring',
    label: 'Circuit rewiring',
  },
  EmodelCircuit: {
    key: 'emodel_circuit',
    label: 'E-model circuit',
  },
  EmDenseReconstructionDatasetCellMorphology: {
    key: 'em_dense_reconstruction_dataset_cell_morphology',
    label: 'EM dense reconstruction dataset cell morphology',
  },
  Unspecified: {
    key: 'unspecified',
    label: 'Unspecified',
  },
} as const;

export const DerivationTypeDictionary = Object.fromEntries(
  Object.entries(DerivationType).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof DerivationType]: (typeof DerivationType)[K]['key'];
};

export type TDerivationType =
  (typeof DerivationTypeDictionary)[keyof typeof DerivationTypeDictionary];

/**
 * Short, circuit-overview labels for the "Derivation type" column/filter (issue #517).
 * Any derivation type not listed here falls back to its generic `DerivationType[...].label`
 * (see {@link getCircuitDerivationLabel}), so future derivation types still render sensibly.
 */
export const CircuitDerivationShortLabel: Partial<Record<TDerivationType, string>> = {
  [DerivationTypeDictionary.CircuitExtraction]: 'Extracted',
  [DerivationTypeDictionary.CircuitRewiring]: 'Rewired',
  [DerivationTypeDictionary.CircuitCustomization]: 'Customized',
};

/** Options offered in the static "Derivation type" dropdown filter, derived from the short labels. */
export const CircuitDerivationFilterOptions: Array<{ value: TDerivationType; label: string }> =
  Object.entries(CircuitDerivationShortLabel).map(([value, label]) => ({
    value: value as TDerivationType,
    label: label as string,
  }));

export const getCircuitDerivationColumnLabels = (
  derivations: ReadonlyArray<{ derivation_type: TDerivationType }>
): string[] =>
  uniq(
    derivations
      .map((d) => CircuitDerivationShortLabel[d.derivation_type])
      .filter((label): label is string => Boolean(label))
  );

export interface IDerivationBase extends EntityCoreIdentifiable, EntityCoreType {}

/** `BasicEntityRead`, the minimal entity ref carried by a derivation (`id` + optional `type`). */
export interface IBasicEntityRead extends EntityCoreIdentifiable {
  type?: TEntityTypeDict | null;
}

/** `NestedEntityRead`, the nested entity ref on an entity's derivation lists (adds an optional name). */
export interface INestedEntityRead extends IBasicEntityRead {
  name?: string | null;
}

/** A derivation where THIS entity is the generated (derived) side — "how it was derived". */
export interface IGeneratedFromDerivation {
  used: INestedEntityRead;
  derivation_type: TDerivationType;
  label?: string | null;
}

/** A derivation where THIS entity is the used (source) side — "what was derived from it". */
export interface IUsedByDerivation {
  generated: INestedEntityRead;
  derivation_type: TDerivationType;
  label?: string | null;
}

/**
 * Derivation lists exposed by every entity read (entitycore #647), opt-in via the `expand` param.
 * `null`/absent unless expanded; `[]` when expanded but the entity has none in that direction.
 */
export interface EntityDerivations {
  generated_from_derivations?: Array<IGeneratedFromDerivation> | null;
  used_by_derivations?: Array<IUsedByDerivation> | null;
}

/** Opt-in derivation lists any entity read can request via `?expand=...` (repeatable). */
export type EntityExpandParam = 'generated_from_derivations' | 'used_by_derivations';

/**
 * Derivation filters available on every entity list endpoint (entitycore #647).
 * `generated_derivation__*` = this entity is the generated (derived) side;
 * `used_derivation__*` = this entity is the used (source) side.
 */
export interface EntityDerivationFilter {
  generated_derivation__derivation_type?: TDerivationType;
  generated_derivation__derivation_type__in?: Array<TDerivationType>;
  generated_derivation__used_id?: string;
  generated_derivation__used_id__in?: Array<string>;
  generated_derivation__generated_id?: string;
  generated_derivation__generated_id__in?: Array<string>;
  used_derivation__derivation_type?: TDerivationType;
  used_derivation__derivation_type__in?: Array<TDerivationType>;
  used_derivation__used_id?: string;
  used_derivation__used_id__in?: Array<string>;
  used_derivation__generated_id?: string;
  used_derivation__generated_id__in?: Array<string>;
}

/**
 * `DerivationRead`, a derivation read response, exposing the linked entities.
 * - `used`: the source entity (e.g. the EM dense reconstruction dataset).
 * - `generated`: the produced entity (e.g. the cell morphology / neuron).
 */
export interface IDerivationRead extends EntityCoreIdentifiable {
  derivation_type: TDerivationType;
  used: IBasicEntityRead;
  generated: IBasicEntityRead;
  label?: string | null;
  creation_date?: string;
  update_date?: string;
}

export interface IDerivationFilter extends PaginationFilter, SharedFilter, EntityCoreTypeFilter {
  derivation_type: TDerivationType;
}

/**
 * filter for the forward `Derivation` search (`GET /derivation`):
 * "what was generated from `used__id`", distinct from the reverse per-entity
 * `/{entity_route}/{entity_id}/derived-from` endpoint.
 */
export interface IDerivationForwardFilter extends Partial<PaginationFilter>, Partial<SharedFilter> {
  derivation_type?: TDerivationType;
  /** restrict to derivations whose source (`used`) entity has this id. */
  used__id?: string;
  used__id__in?: string[];
  used__type?: TEntityTypeDict;
  /** restrict to derivations whose generated entity has this id. */
  generated__id?: string;
  generated__id__in?: string[];
  generated__type?: TEntityTypeDict;
}
