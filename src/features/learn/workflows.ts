/*
 * The Learn page's Workflows section: obi-one's ScanConfigs, the configurations behind the
 * platform's workflows, read from its live OpenAPI schema on the server and cached for an hour.
 * Only those obi-one marks ui_enabled, the ones the platform's workflows show. Each is a set of
 * fields in groups; most are a block, or a dictionary of blocks of a few kinds, and every kind of
 * block is listed with its parameters.
 */

const OBI_ONE_OPENAPI = 'https://staging.openbraininstitute.org/api/obi-one/openapi.json';
const HOUR = 3600;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type WfParam = {
  name: string;
  title: string;
  description?: string;
  /** What it takes, e.g. "number, or a list of numbers", or "Circuit | CircuitFromID". */
  typeLabel: string;
  /** Blocks it may be, where it is itself a block. */
  blocks?: string[];
  defaultValue?: string;
  options?: string[];
  units?: string;
  min?: number;
  max?: number;
  uiElement?: string;
  required: boolean;
};

export type WfBlock = {
  id: string;
  title: string;
  description?: string;
  params: WfParam[];
};

export type WfSection = {
  key: string;
  title: string;
  description?: string;
  group?: string;
  /** "block_single": one block; "block_dictionary": any number, named, of the kinds listed. */
  kind: string;
  singular?: string;
  blocks: string[];
};

export type WfConfig = {
  id: string;
  title: string;
  description?: string;
  groups: string[];
  sections: WfSection[];
};

export type Workflows = {
  version?: string;
  configs: WfConfig[];
  blocks: Record<string, WfBlock>;
};

const refName = (ref: string) => ref.split('/').pop() ?? ref;

/** Spaced words for a class name: CircuitSimulationScanConfig -> Circuit Simulation. */
export const spaced = (name: string) =>
  name
    .replace(/ScanConfig$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

/** The block schemas a field may hold: its $refs, through anyOf, oneOf and arrays. */
/** Each once, in the order first met. */
const once = <T>(xs: T[]) => [...new Set(xs)];

function refsOf(sc: Json): string[] {
  return once(refsIn(sc));
}

function refsIn(sc: Json): string[] {
  if (!sc || typeof sc !== 'object') return [];
  if (sc.$ref) return [refName(sc.$ref)];
  return [
    ...(sc.anyOf ?? []).flatMap(refsIn),
    ...(sc.oneOf ?? []).flatMap(refsIn),
    ...(sc.items ? refsIn(sc.items) : []),
    ...(sc.additionalProperties && typeof sc.additionalProperties === 'object'
      ? refsIn(sc.additionalProperties)
      : []),
  ];
}

/** A field's type in words: what it is, or the choices it is one of. */
function typeOf(sc: Json, schemas: Json): string {
  if (!sc) return 'any';
  if (sc.$ref) {
    const name = refName(sc.$ref);
    const target = schemas[name];
    if (target?.enum) return 'one of the options';
    return name.replace(/^obi_one__.*__/, '');
  }
  if (sc.const !== undefined) return JSON.stringify(sc.const);
  if (sc.anyOf || sc.oneOf) {
    const parts = (sc.anyOf ?? sc.oneOf)
      .filter((x: Json) => x.type !== 'null')
      .map((x: Json) => typeOf(x, schemas));
    return [...new Set(parts)].join(' | ');
  }
  if (sc.type === 'array') return `list of ${typeOf(sc.items, schemas)}`;
  if (sc.enum) return 'one of the options';
  return sc.type ?? 'object';
}

function paramOf(name: string, sc: Json, required: boolean, schemas: Json): WfParam {
  const options = (sc.enum ?? refsOf(sc).flatMap((r) => schemas[r]?.enum ?? [])) as unknown[];
  const blocks = refsOf(sc).filter((r) => schemas[r]?.properties && !r.endsWith('Reference'));
  const bound = (k: 'minimum' | 'maximum') =>
    sc[k] ?? (sc.anyOf ?? []).map((x: Json) => x[k]).find((x: unknown) => x !== undefined);
  return {
    name,
    title: sc.title ?? name,
    description: sc.description,
    typeLabel: typeOf(sc, schemas),
    blocks: blocks.length ? blocks : undefined,
    defaultValue: sc.default === undefined ? undefined : JSON.stringify(sc.default),
    options: options.length ? once(options.map(String)) : undefined,
    units: sc.units,
    min: bound('minimum'),
    max: bound('maximum'),
    uiElement: sc.ui_element,
    required,
  };
}

function blockOf(id: string, schemas: Json): WfBlock {
  const sc = schemas[id] ?? {};
  const req = new Set<string>(sc.required ?? []);
  return {
    id,
    title:
      sc.title && !sc.title.includes('__') ? sc.title : spaced(id.replace(/^obi_one__.*__/, '')),
    description: sc.description,
    params: Object.entries((sc.properties ?? {}) as Json)
      .filter(([n]) => n !== 'type')
      .sort(([, a], [, b]) => (b.parameter_order_priority ?? 0) - (a.parameter_order_priority ?? 0))
      .map(([n, p]) => paramOf(n, p, req.has(n), schemas)),
  };
}

/** obi-one's ScanConfigs shown in the platform's workflows, with every block they can hold. */
export async function obiOneWorkflows(): Promise<Workflows> {
  let api: Json;
  try {
    const res = await fetch(OBI_ONE_OPENAPI, { next: { revalidate: HOUR } });
    if (!res.ok) return { configs: [], blocks: {} };
    api = await res.json();
  } catch {
    return { configs: [], blocks: {} };
  }
  const schemas: Json = api.components?.schemas ?? {};
  const blocks: Record<string, WfBlock> = {};
  const configs = Object.entries(schemas)
    .filter(([name, sc]) => name.endsWith('ScanConfig') && (sc as Json).ui_enabled)
    .map(([name, sc]): WfConfig => {
      const s = sc as Json;
      const sections = Object.entries((s.properties ?? {}) as Json)
        .filter(([key]) => key !== 'type')
        .map(([key, p]): WfSection => {
          const kinds = refsOf(p).filter((r) => schemas[r]?.properties);
          for (const k of kinds) blocks[k] ??= blockOf(k, schemas);
          return {
            key,
            title: p.title ?? key,
            description: p.description,
            group: p.group,
            kind: p.ui_element ?? 'block_single',
            singular: p.singular_name,
            blocks: kinds,
          };
        })
        .sort(
          (a, b) =>
            (s.group_order ?? []).indexOf(a.group) - (s.group_order ?? []).indexOf(b.group) ||
            (s.properties[a.key].group_order ?? 0) - (s.properties[b.key].group_order ?? 0)
        );
      // the blocks inside the blocks, and theirs: a parameter that is itself a block of some kinds
      for (let more = true; more; ) {
        more = false;
        for (const b of Object.values(blocks))
          for (const p of b.params)
            for (const k of p.blocks ?? [])
              if (!blocks[k]) {
                blocks[k] = blockOf(k, schemas);
                more = true;
              }
      }
      return {
        id: name,
        title: s.title && s.title !== name ? s.title : spaced(name),
        description: s.description,
        groups: s.group_order ?? [],
        sections,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
  return { version: api.info?.version, configs, blocks };
}
