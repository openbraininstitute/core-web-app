import {
  CircuitBuildCategory,
  CircuitScale,
  CircuitTargetSimulator,
} from '@/api/entitycore/types/entities/circuit';
import {
  CircuitDerivationFilterOptions,
  getCircuitDerivationColumnLabels,
} from '@/api/entitycore/types/entities/derivation';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { CircuitGridBody } from '@/features/data-grid/host/circuit-grid-body';
import { countDeepSubCircuits } from '@/ui/segments/explore/circuit/helpers';

import { OperatorId } from '../../../core';
import { descriptionColumn, nameColumn, speciesColumn } from '../columns/catalog';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ICircuitEnriched } from '@/ui/segments/explore/circuit/helpers';
import type { ColumnModel, FilterOptionsSource, GridSchema } from '../../../core';
import type { EntityGridDefinition } from '../registry';

/** Localized integer, matching the legacy `renderLocalizedNumber`. */
function localizedNumber(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? '' : value.toLocaleString();
}

/** Build a static option source from a `{ key, label }` dictionary. */
function staticOptions(dict: Record<string, { key: string; label: string }>): FilterOptionsSource {
  return {
    kind: 'static',
    items: Object.values(dict).map((item) => ({ id: item.key, label: item.label })),
  };
}

/**
 * Re-authored circuit grid schema. Column ids equal the legacy antd column keys
 * (the {@link EntityCoreFields} values) so the top-level controller's hidden-column
 * set maps 1:1 onto the nested `CircuitRecursiveGrid`'s antd columns (see
 * {@link CircuitGridBody}). Column order mirrors the legacy `ViewDefForCircuit`
 * (minus the antd-only Download action column, replaced by the shared selection +
 * bulk download). Per-column server filters/sorts are locked to the legacy
 * `transformFiltersToQuery` oracle by the circuit parity test.
 */
export const circuitSchema: GridSchema<ICircuit> = {
  id: 'circuit',
  getRowId: (row) => row.id,
  selection: { enabled: true },
  // Detail rows host the recursive subcircuit grid (hierarchy view). The runtime is
  // supplied by the plugin body (`detailOverride`); this only sizes the detail row.
  detail: {
    rendererKey: 'circuit-subcircuits',
    isExpandable: (row) => {
      const enriched = row as ICircuitEnriched;
      return Boolean(enriched.sub_circuits && enriched.sub_circuits.length > 0);
    },
    minHeight: 120,
  },
  columns: [
    nameColumn<ICircuit>({ id: EntityCoreFields.Name }),
    // Hosts the expand chevron (right-aligned) in hierarchy view; empty otherwise.
    {
      id: EntityCoreFields.CircuitSubCircuit,
      header: 'Subcircuits',
      align: 'left',
      width: { width: 110, minWidth: 90 },
      getValue: (row) => {
        const enriched = row as ICircuitEnriched;
        return 'sub_circuits' in row ? countDeepSubCircuits(enriched) || '' : '';
      },
    } satisfies ColumnModel<ICircuit>,
    descriptionColumn<ICircuit>({ id: EntityCoreFields.Description }),
    // ICircuit's type omits `brain_region` (present on the wire); read it via a cast
    // — same shape the catalog `brainRegionColumn` reads, region gating owns filtering.
    {
      id: EntityCoreFields.BrainRegion,
      header: 'Brain region',
      sortable: true,
      sortField: 'brain_region__name',
      width: { minWidth: 150, flex: 1 },
      getValue: (row) =>
        (row as unknown as { brain_region?: { name?: string | null } }).brain_region?.name ?? '',
    } satisfies ColumnModel<ICircuit>,
    speciesColumn<ICircuit>({ id: EntityCoreFields.SpeciesName }),
    {
      id: EntityCoreFields.CircuitScale,
      header: 'Scale',
      align: 'left',
      sortable: true,
      sortField: 'scale',
      width: { width: 120, minWidth: 100 },
      getValue: (row) => CircuitScale[keyByValue(CircuitScale, row.scale)]?.label ?? '',
      filter: {
        operators: [OperatorId.In],
        field: 'scale',
        // options mirror the legacy dropdown (all scales except "Single").
        options: {
          kind: 'static',
          items: Object.values(CircuitScale)
            .filter((s) => s.key !== CircuitScale.Single.key)
            .map((s) => ({ id: s.key, label: s.label })),
        },
      },
    } satisfies ColumnModel<ICircuit>,
    numberColumn(EntityCoreFields.CircuitNumberNeurons, 'Number of neurons', 'number_neurons'),
    numberColumn(EntityCoreFields.CircuitNumberSynapses, 'Number of synapses', 'number_synapses'),
    numberColumn(
      EntityCoreFields.CircuitNumberConnections,
      'Number of connections',
      'number_connections'
    ),
    {
      id: EntityCoreFields.CircuitBuildCategory,
      header: 'Build category',
      align: 'left',
      sortable: true,
      sortField: 'build_category',
      width: { minWidth: 140, flex: 1 },
      getValue: (row) =>
        CircuitBuildCategory[keyByValue(CircuitBuildCategory, row.build_category)]?.label ?? '',
      filter: {
        operators: [OperatorId.In],
        field: 'build_category',
        options: staticOptions(CircuitBuildCategory),
      },
    } satisfies ColumnModel<ICircuit>,
    {
      id: EntityCoreFields.CircuitTargetSimulator,
      header: 'Target simulator',
      align: 'left',
      sortable: true,
      sortField: 'target_simulator',
      width: { minWidth: 150, flex: 1 },
      getValue: (row) =>
        row.target_simulator
          ? (CircuitTargetSimulator[keyByValue(CircuitTargetSimulator, row.target_simulator)]
              ?.label ?? '')
          : '',
      filter: {
        operators: [OperatorId.In],
        field: 'target_simulator',
        options: staticOptions(CircuitTargetSimulator),
      },
    } satisfies ColumnModel<ICircuit>,
    {
      id: EntityCoreFields.CircuitDerivationType,
      header: 'Derivation type',
      align: 'left',
      width: { minWidth: 140, flex: 1 },
      getValue: (row) => {
        const derivations =
          'generated_from_derivations' in row ? row.generated_from_derivations : null;
        const labels = derivations ? getCircuitDerivationColumnLabels(derivations) : [];
        return labels.length ? labels.join(', ') : '';
      },
      // Static enum filter (backend exposes a plain enum, not a facet). Not sortable.
      filter: {
        operators: [OperatorId.In],
        field: 'generated_derivation__derivation_type',
        options: {
          kind: 'static',
          items: CircuitDerivationFilterOptions.map((o) => ({ id: o.value, label: o.label })),
        },
      },
    } satisfies ColumnModel<ICircuit>,
    {
      id: EntityCoreFields.ArtifactPublishedIn,
      header: 'Published in',
      align: 'left',
      sortable: true,
      sortField: 'published_in',
      width: { minWidth: 150, flex: 1 },
      getValue: (row) => row.published_in ?? '',
    } satisfies ColumnModel<ICircuit>,
    {
      id: EntityCoreFields.ArtifactExperimentDate,
      header: 'Experiment date',
      align: 'left',
      width: { minWidth: 140 },
      getValue: (row) => formatDate(row.experiment_date),
    } satisfies ColumnModel<ICircuit>,
  ],
};

/** ValueRange number column (localized display, `field__gte`/`field__lte` filter). */
function numberColumn(id: string, header: string, field: string): ColumnModel<ICircuit> {
  return {
    id,
    header,
    align: 'right',
    sortable: true,
    sortField: field,
    width: { minWidth: 130 },
    getValue: (row) => localizedNumber((row as unknown as Record<string, number>)[field]),
    filter: { operators: [OperatorId.Range], field },
  };
}

/** Reverse-lookup a dictionary's enum KEY from a stored value `key`. */
function keyByValue<T extends Record<string, { key: string }>>(
  dict: T,
  value: string | null | undefined
): keyof T {
  return (Object.keys(dict) as Array<keyof T>).find((k) => dict[k].key === value) as keyof T;
}

/** ISO → localized date, matching the legacy `renderDate` (empty when absent). */
function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const circuitGridDefinition: EntityGridDefinition<ICircuit> = {
  dataType: ExtendedEntitiesTypeDict.Circuit,
  schema: circuitSchema,
  plugin: { Body: CircuitGridBody },
};
