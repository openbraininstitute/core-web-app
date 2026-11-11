'use client';

import { useEffect, useState } from 'react';

import { useSimulation } from '@/features/spike-viewer/simulation-context';

import type {
  ColumnFilter,
  ColumnMeta,
  DerivedColumn,
  FilterModel,
} from '@/features/circuit-nodes/types';

/** Its owner name in the shared nodes session; both tables register the same columns. */
const OWNER = 'neuron-sets';
/** Keeps a neuron set's column from ever meeting a node attribute of the same name. */
const PREFIX = 'neuron_set:';
const LIBRARY = ['false', 'true'];

const NO_COLUMNS: ColumnMeta[] = [];

type Options = {
  /** The session is open, so its columns can be read and added to. */
  ready: boolean;
  sessionKey: string;
  /** The node population on show, which a node set may name. */
  population: string | undefined;
  rowCount: number;
  /** The file's columns, which a node set's properties are matched against. */
  columns: ColumnMeta[] | undefined;
  getFilteredIndices: (filter: FilterModel) => Promise<Uint32Array | null>;
  setDerivedColumns: (owner: string, columns: DerivedColumn[]) => Promise<void>;
};

/**
 * A `true`/`false` column per neuron set the simulation's config defines: which
 * cells of the population on show it holds, as the simulation resolved it into
 * a node set. Registered in the nodes session, so the tables list, sort and
 * filter them like the file's own and the statistics can group by them; their
 * metadata, once they are in, is what this returns.
 *
 * A set naming another population holds none of these cells. One the table
 * cannot read - a property the file lacks, an expression past equality - is
 * left out rather than shown wrong.
 */
export function useNeuronSetColumns({
  ready,
  sessionKey,
  population,
  rowCount,
  columns,
  getFilteredIndices,
  setDerivedColumns,
}: Options): ColumnMeta[] {
  const { neuronSets } = useSimulation();
  const [registered, setRegistered] = useState<{
    session: string;
    sets: unknown;
    metas: ColumnMeta[];
  }>();

  useEffect(() => {
    if (!ready || !population || !columns || !neuronSets || neuronSets.names.length === 0) return;
    let cancelled = false;
    (async () => {
      const resolved: { name: string; flags: Uint8Array }[] = [];
      for (const name of neuronSets.names) {
        const flags = await membersOf(name, {
          nodeSets: neuronSets.nodeSets,
          population,
          rowCount,
          columns,
          getFilteredIndices,
        });
        if (flags) resolved.push({ name, flags });
      }
      if (cancelled) return;
      await setDerivedColumns(
        OWNER,
        resolved.map(({ name, flags }) => ({
          name: `${PREFIX}${name}`,
          library: LIBRARY,
          indices: Uint32Array.from(flags),
        }))
      );
      if (cancelled) return;
      setRegistered({
        session: sessionKey,
        sets: neuronSets,
        metas: resolved.map(({ name }) => ({
          name: `${PREFIX}${name}`,
          kind: 'categorical',
          library: LIBRARY,
          // Named for the set first, and said to be whether a cell is in it.
          label: `${name} (membership in)`,
        })),
      });
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    ready,
    population,
    columns,
    neuronSets,
    rowCount,
    sessionKey,
    getFilteredIndices,
    setDerivedColumns,
  ]);

  return registered?.session === sessionKey && registered.sets === neuronSets
    ? registered.metas
    : NO_COLUMNS;
}

type Context = {
  nodeSets: Record<string, unknown>;
  population: string;
  rowCount: number;
  columns: ColumnMeta[];
  getFilteredIndices: (filter: FilterModel) => Promise<Uint32Array | null>;
};

/**
 * One flag per node of the population for the node set `name`, or null where
 * it cannot be read. SONATA node sets are a list of other sets' names (their
 * union) or a set of conditions, all of which a node meets: its population,
 * its id among `node_id`, and any other property equal to one of its values.
 */
async function membersOf(
  name: string,
  context: Context,
  seen: ReadonlySet<string> = new Set()
): Promise<Uint8Array | null> {
  const definition = context.nodeSets[name];
  if (definition === undefined || seen.has(name)) return null;
  const within = new Set(seen).add(name);
  const flags = new Uint8Array(context.rowCount);

  if (Array.isArray(definition)) {
    for (const part of definition) {
      if (typeof part !== 'string') return null;
      const members = await membersOf(part, context, within);
      if (!members) return null;
      for (let i = 0; i < flags.length; i++) flags[i] |= members[i];
    }
    return flags;
  }
  if (typeof definition !== 'object' || definition === null) return null;

  const { population, node_id: nodeIds, ...properties } = definition as Record<string, unknown>;
  const populations = population === undefined ? undefined : [population].flat();
  if (populations && !populations.includes(context.population)) return flags;

  if (nodeIds === undefined) flags.fill(1);
  else if (Array.isArray(nodeIds)) {
    for (const id of nodeIds) {
      if (Number.isInteger(id) && id >= 0 && id < flags.length) flags[id] = 1;
    }
  } else return null;

  if (Object.keys(properties).length > 0) {
    const model = propertyFilter(properties, context.columns);
    if (!model) return null;
    const kept = await context.getFilteredIndices(model);
    if (kept) {
      const pass = new Uint8Array(flags.length);
      for (const row of kept) pass[row] = 1;
      for (let i = 0; i < flags.length; i++) flags[i] &= pass[i];
    }
  }
  return flags;
}

/** A node set's property conditions as the table's own filters; null for one it cannot express. */
function propertyFilter(
  properties: Record<string, unknown>,
  columns: ColumnMeta[]
): FilterModel | null {
  const model: FilterModel = {};
  for (const [property, value] of Object.entries(properties)) {
    const column = columns.find((c) => c.name === property);
    const values = [value].flat();
    if (!column || values.some((v) => typeof v === 'object' || v === undefined)) return null;
    const texts = values.map(String);
    let filter: ColumnFilter;
    if (column.kind === 'categorical') filter = { filterType: 'set', values: texts };
    else if (column.kind === 'numeric') {
      filter = {
        filterType: 'number',
        operator: 'OR',
        conditions: texts.map((t) => ({ filterType: 'number', type: 'equals', filter: t })),
      };
    } else {
      filter = {
        filterType: 'text',
        operator: 'OR',
        conditions: texts.map((t) => ({ filterType: 'text', type: 'equals', filter: t })),
      };
    }
    model[property] = filter;
  }
  return model;
}
