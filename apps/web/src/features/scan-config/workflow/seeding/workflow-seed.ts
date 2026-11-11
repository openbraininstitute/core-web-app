import { buildBlockDefaults } from '@/features/scan-config/components/hooks/block-defaults';
import { nextEntryName } from '@/features/scan-config/components/hooks/entry-name';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { isType, ScanConfigUIElementDict } from '@/features/scan-config/types';
import {
  applyWorkflowSessionSelectionPatch,
  collectSessionSelectionRefs,
} from '@/features/scan-config/workflow/workflow-session-selection';

import type { TEntityQuery } from '@/features/scan-config/helpers';
import type {
  Config,
  ConfigSchema,
  ConfigValue,
  IBlockDictionary,
} from '@/features/scan-config/types';
import type {
  TBlockSeedTarget,
  TWorkflowEntitySeed,
  TWorkflowSeedApplyArgs,
  TWorkflowSeedAttributes,
  TWorkflowSeedContext,
} from '@/features/scan-config/workflow/seeding/types';

const ISNULL_FILTER_SUFFIX = '__isnull';

function listBlockDictionaries(schema: ConfigSchema): Array<[string, IBlockDictionary]> {
  return Object.entries(schema.properties ?? {}).filter(
    (entry): entry is [string, IBlockDictionary] =>
      !isType(entry[1]) && entry[1].ui_element === ScanConfigUIElementDict.BlockDictionary
  );
}

function readEntityQuery(field: unknown): TEntityQuery | undefined {
  if (!isPlainObject(field)) return undefined;
  const entityQuery = field.entity_query;
  return isPlainObject(entityQuery) ? (entityQuery as TEntityQuery) : undefined;
}

/** The `type` discriminator ObiOne pins on a field's value object, when it declares one. */
export function readFieldTypeConst(field: unknown): string | undefined {
  if (!isPlainObject(field)) return undefined;
  const properties = field.properties;
  if (!isPlainObject(properties)) return undefined;
  const type = properties.type;
  return isPlainObject(type) && typeof type.const === 'string' ? type.const : undefined;
}

/**
 * Evaluates a variant's `entity_query.filters` against the seeded entity's attributes.
 *
 * ObiOne emits two forms today: `<field>__isnull: boolean` and plain equality. An attribute the
 * seed did not carry makes the filter fail rather than pass, so an unverifiable variant is never
 * chosen silently.
 */
export function matchesEntityQueryFilters(
  filters: Record<string, unknown> | undefined,
  attributes: TWorkflowSeedAttributes | undefined
): boolean {
  const entries = Object.entries(filters ?? {});
  if (entries.length === 0) return true;
  if (!attributes) return false;

  return entries.every(([key, expected]) => {
    if (key.endsWith(ISNULL_FILTER_SUFFIX)) {
      const field = key.slice(0, -ISNULL_FILTER_SUFFIX.length);
      if (!(field in attributes)) return false;
      return (attributes[field] == null) === Boolean(expected);
    }

    if (!(key in attributes)) return false;
    return attributes[key] === expected;
  });
}

/**
 * How a workflow pre-fills its scan-config editor from the entity a launcher started on.
 *
 * The base class covers both shapes ObiOne emits today, resolved from schema annotations rather
 * than hardcoded config keys:
 *
 * - the entity belongs under `initialize` (`model_identifier*`) — handled by
 *   {@link applyWorkflowSessionSelectionPatch};
 * - the entity belongs in a block dictionary (`model_selector_single` + `entity_query`), where the
 *   variant is chosen from the entity's own attributes.
 *
 * A workflow subclasses it to declare what its launchers carry ({@link build}) and, when the
 * generic shapes are not enough, how a selection is written ({@link do}).
 */
export class WorkflowSeed<TEntity = unknown> {
  /**
   * Launcher side: what to carry from the source entity into the editor session. Returning `null`
   * (the default) means the entity id alone is enough.
   */
  build(_entity: TEntity): TWorkflowEntitySeed | null {
    return null;
  }

  /** Editor side: turn a stored browse/detail-page selection into editor form state. */
  applyTo({ config, schema, sessionSelection, resolveFromIdType }: TWorkflowSeedApplyArgs): Config {
    const initializePatched = applyWorkflowSessionSelectionPatch({
      config,
      schema,
      sessionSelection,
      resolveFromIdType,
    });
    if (initializePatched !== config) {
      return initializePatched;
    }

    const usedNames = this.collectEntryNames(config, schema);
    let patched = config;

    for (const ref of collectSessionSelectionRefs(sessionSelection)) {
      const fromIdType = resolveFromIdType(ref.type);
      if (!fromIdType) continue;

      patched = this.do({ config: patched, schema, ref, fromIdType, usedNames });
    }

    return patched;
  }

  /**
   * Writes one selection into the config: the entity's own block, then a block per value the seed
   * derived from it.
   *
   * Order matters — widgets such as the recordable-variable select read the already-seeded models
   * out of the config to resolve their options.
   */
  do({ config, schema, ref, fromIdType, usedNames }: TWorkflowSeedContext): Config {
    const entityTarget = this.resolveEntityTarget({
      schema,
      fromIdType,
      attributes: ref.attributes,
    });
    if (!entityTarget) return config;

    let patched = this.addEntry({
      config,
      schema,
      usedNames,
      target: entityTarget,
      block: {
        ...buildBlockDefaults(entityTarget.variant),
        [entityTarget.fieldKey]: { type: fromIdType, id_str: ref.id },
      },
    });

    for (const seededProperty of ref.properties ?? []) {
      const propertyTarget = this.resolvePropertyTarget({
        schema,
        property: seededProperty.property,
      });
      if (!propertyTarget) continue;

      // the value's own discriminator comes from the schema, so seed builders stay free of
      // ObiOne const strings
      const valueType = readFieldTypeConst(
        propertyTarget.variant.properties?.[propertyTarget.fieldKey]
      );

      for (const value of seededProperty.values) {
        patched = this.addEntry({
          config: patched,
          schema,
          usedNames,
          target: propertyTarget,
          block: {
            ...buildBlockDefaults(propertyTarget.variant),
            [propertyTarget.fieldKey]: valueType ? { type: valueType, ...value } : value,
          },
        });
      }
    }

    return patched;
  }

  /**
   * Finds where an entity of the given ObiOne FromID type belongs in a block dictionary.
   *
   * When exactly one variant accepts the type it is used regardless of filters; when several do
   * and none can be verified against `attributes`, nothing is seeded — a wrong variant would
   * silently drop parameters at run time.
   */
  resolveEntityTarget({
    schema,
    fromIdType,
    attributes,
  }: {
    schema: ConfigSchema;
    fromIdType: string;
    attributes?: TWorkflowSeedAttributes;
  }): TBlockSeedTarget | null {
    const candidates: Array<TBlockSeedTarget & { entityQuery?: TEntityQuery }> = [];

    for (const [rootKey, dictionary] of listBlockDictionaries(schema)) {
      for (const variant of dictionary.additionalProperties?.oneOf ?? []) {
        for (const [fieldKey, field] of Object.entries(variant.properties ?? {})) {
          if (isType(field) || field.ui_element !== ScanConfigUIElementDict.ModelSelectorSingle) {
            continue;
          }
          if (readFieldTypeConst(field) !== fromIdType) continue;

          candidates.push({ rootKey, variant, fieldKey, entityQuery: readEntityQuery(field) });
        }
      }
    }

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    return (
      candidates.find((candidate) =>
        matchesEntityQueryFilters(candidate.entityQuery?.filters, attributes)
      ) ?? null
    );
  }

  /**
   * Finds where a value derived from the seeded entity belongs, matched on ObiOne's `property`
   * annotation (e.g. `RecordableVariables` on an ion-channel variable recording).
   */
  resolvePropertyTarget({
    schema,
    property,
  }: {
    schema: ConfigSchema;
    property: string;
  }): TBlockSeedTarget | null {
    for (const [rootKey, dictionary] of listBlockDictionaries(schema)) {
      for (const variant of dictionary.additionalProperties?.oneOf ?? []) {
        for (const [fieldKey, field] of Object.entries(variant.properties ?? {})) {
          if (isType(field)) continue;
          if ((field as { property?: string }).property === property) {
            return { rootKey, variant, fieldKey };
          }
        }
      }
    }

    return null;
  }

  /** Entry names already used across every block dictionary, so seeded names never collide. */
  protected collectEntryNames(config: Config, schema: ConfigSchema): Set<string> {
    const names = new Set<string>();

    for (const [rootKey] of listBlockDictionaries(schema)) {
      const entries = config[rootKey];
      if (!isPlainObject(entries)) continue;
      for (const name of Object.keys(entries)) names.add(name);
    }

    return names;
  }

  /** Appends a block-dictionary entry under the next free name, matching what the UI would name it. */
  protected addEntry({
    config,
    schema,
    usedNames,
    target,
    block,
  }: {
    config: Config;
    schema: ConfigSchema;
    usedNames: Set<string>;
    target: TBlockSeedTarget;
    block: Record<string, ConfigValue>;
  }): Config {
    const dictionary = config[target.rootKey];
    if (!isPlainObject(dictionary)) return config;

    const name = nextEntryName(schema, target.rootKey, usedNames);
    usedNames.add(name);

    return {
      ...config,
      [target.rootKey]: { ...dictionary, [name]: block },
    };
  }
}

/** Used by workflows that declare no seed of their own: the generic schema-driven behaviour. */
export const defaultWorkflowSeed = new WorkflowSeed();

/**
 * A seed held without knowing its entity type: what a workflow definition stores and what the
 * editor plumbing passes around. Only the launcher that owns the entity calls `build` with a
 * real one.
 */
export type TAnyWorkflowSeed = WorkflowSeed<never>;
