import { isBlockReference } from '@/features/scan-config/components/rewrite-block-references';
import {
  isReferenceFieldVisible,
  resolveDefaultReferenceLabel,
} from '@/features/scan-config/components/ui-elements/reference';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { isType, ScanConfigUIElementDict } from '@/features/scan-config/types';

import type {
  Config,
  ConfigSchema,
  ConfigValue,
  Reference,
  TBlock,
} from '@/features/scan-config/types';

export type BlockGraphNode = {
  /** `rootElement/entry` for a dictionary entry, `rootElement` for a single block,
   * `default:<label>` for a default block that a field falls back to */
  id: string;
  rootElement: string;
  /** the dictionary entry's name; empty for a single block or a default */
  entry: string;
  label: string;
  /** the block variant's title, e.g. "Constant Current Clamp Somatic Stimulus" */
  subtitle: string;
  isDefault: boolean;
  column: number;
  row: number;
};

export type BlockGraphEdge = {
  id: string;
  /** the block that is referred to */
  source: string;
  /** the block whose field refers to it */
  target: string;
  /** the referring field's name, e.g. `neuron_set` */
  field: string;
  isDefault: boolean;
};

export type BlockGraph = { nodes: BlockGraphNode[]; edges: BlockGraphEdge[] };

const DEFAULT_PREFIX = 'default:';

/**
 * The blocks of a config and the references between them, laid out in columns.
 *
 * Every entry of a `block_dictionary` and every `block_single` / `block_union` root is a node.
 * Every `{ block_dict_name, block_name }` found in a block's value (nested ones in
 * `combined_with` tuples included) is an edge from the block referred to, to the block holding
 * the reference. A visible `reference` field left unset is an edge from the default it falls
 * back to (e.g. "All Biophysical Neurons"), drawn as its own node.
 *
 * A node's column is its depth: a block that refers to nothing is in column 0, any other one
 * column right of the deepest block it refers to. Rows follow the schema's order.
 */
export function buildBlockGraph(schema: ConfigSchema, config: Config): BlockGraph {
  const nodes: BlockGraphNode[] = [];
  const blocks: Array<{ node: BlockGraphNode; value: unknown; variant: TBlock | undefined }> = [];

  for (const [rootElement, spec] of orderedRootElements(schema)) {
    if (spec.ui_element === ScanConfigUIElementDict.BlockDictionary) {
      const entries = config[rootElement];
      if (!isPlainObject(entries)) continue;
      for (const [entry, value] of Object.entries(entries)) {
        const variant = findVariant(spec.additionalProperties.oneOf, value);
        const node = makeNode(`${rootElement}/${entry}`, rootElement, entry, entry, variant?.title);
        nodes.push(node);
        blocks.push({ node, value, variant });
      }
    } else if (spec.ui_element === ScanConfigUIElementDict.BlockSingle) {
      const node = makeNode(rootElement, rootElement, '', spec.title, undefined);
      nodes.push(node);
      blocks.push({ node, value: config[rootElement], variant: spec });
    } else if (spec.ui_element === ScanConfigUIElementDict.BlockUnion) {
      const value = config[rootElement];
      const variant = findVariant(spec.oneOf, value);
      const node = makeNode(rootElement, rootElement, '', spec.title, variant?.title);
      nodes.push(node);
      blocks.push({ node, value, variant });
    }
  }

  const ids = new Set(nodes.map((n) => n.id));
  const edges: BlockGraphEdge[] = [];
  const defaults = new Map<string, BlockGraphNode>();

  for (const { node, value, variant } of blocks) {
    if (!isPlainObject(value)) continue;
    for (const [field, fieldValue] of Object.entries(value)) {
      for (const ref of collectReferences(fieldValue)) {
        const source = resolveReferenceTarget(ref, nodes);
        if (!source || !ids.has(source)) continue;
        edges.push({
          id: `${source}->${node.id}:${field}:${edges.length}`,
          source,
          target: node.id,
          field,
          isDefault: false,
        });
      }
    }

    // unset reference fields fall back to a default block
    for (const [field, fieldSchema] of Object.entries(variant?.properties ?? {})) {
      if (!isReferenceSchema(fieldSchema)) continue;
      if (value[field] !== undefined && value[field] !== null) continue;
      if (!isReferenceFieldVisible(fieldSchema, schema)) continue;
      const label = resolveDefaultReferenceLabel(fieldSchema, schema);
      const id = `${DEFAULT_PREFIX}${label}`;
      if (!defaults.has(id))
        defaults.set(id, makeNode(id, '', '', label, 'Used where the field is unset', true));
      edges.push({
        id: `${id}->${node.id}:${field}`,
        source: id,
        target: node.id,
        field,
        isDefault: true,
      });
    }
  }

  const all = [...defaults.values(), ...nodes];
  layout(all, edges);
  return { nodes: all, edges };
}

function orderedRootElements(schema: ConfigSchema) {
  return Object.entries(schema.properties ?? {})
    .flatMap(([key, spec]) => {
      if (isType(spec)) return [];
      if ('ui_hidden' in spec && spec.ui_hidden) return [];
      return [[key, spec] as const];
    })
    .sort(([, a], [, b]) => {
      const byGroup = schema.group_order.indexOf(a.group) - schema.group_order.indexOf(b.group);
      return byGroup !== 0 ? byGroup : a.group_order - b.group_order;
    });
}

function makeNode(
  id: string,
  rootElement: string,
  entry: string,
  label: string,
  subtitle: string | undefined,
  isDefault = false
): BlockGraphNode {
  return { id, rootElement, entry, label, subtitle: subtitle ?? '', isDefault, column: 0, row: 0 };
}

function findVariant(variants: TBlock[] | undefined, value: unknown): TBlock | undefined {
  if (!isPlainObject(value) || typeof value.type !== 'string') return undefined;
  return variants?.find((v) => v.properties?.type?.const === value.type);
}

function isReferenceSchema(fieldSchema: unknown): fieldSchema is Reference {
  return (
    isPlainObject(fieldSchema) &&
    fieldSchema.ui_element === ScanConfigUIElementDict.Reference &&
    Array.isArray(fieldSchema.reference_types)
  );
}

type FoundReference = { block_name: string; block_dict_name?: unknown };

function collectReferences(value: unknown, found: FoundReference[] = []): FoundReference[] {
  if (isBlockReference(value)) {
    found.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectReferences(item, found);
  } else if (isPlainObject(value)) {
    for (const item of Object.values(value)) collectReferences(item as ConfigValue, found);
  }
  return found;
}

/** The referred block's node id. The AI chat may leave `block_dict_name` out, so a reference
 * without one resolves to the first entry of that name in any dictionary. */
function resolveReferenceTarget(ref: FoundReference, nodes: BlockGraphNode[]) {
  if (typeof ref.block_dict_name === 'string' && ref.block_dict_name) {
    return `${ref.block_dict_name}/${ref.block_name}`;
  }
  return nodes.find((n) => n.entry === ref.block_name)?.id;
}

function layout(nodes: BlockGraphNode[], edges: BlockGraphEdge[]) {
  const sourcesOf = new Map<string, string[]>();
  for (const e of edges) sourcesOf.set(e.target, [...(sourcesOf.get(e.target) ?? []), e.source]);

  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0; // a cycle; references should not form one
    visiting.add(id);
    const sources = sourcesOf.get(id) ?? [];
    const d = sources.length ? 1 + Math.max(...sources.map(depthOf)) : 0;
    visiting.delete(id);
    depth.set(id, d);
    return d;
  };

  const rows = new Map<number, number>();
  for (const node of nodes) {
    node.column = depthOf(node.id);
    node.row = rows.get(node.column) ?? 0;
    rows.set(node.column, node.row + 1);
  }
}
