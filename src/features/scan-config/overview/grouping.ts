export type TEntityRef = { id: string; type?: string | null; name?: string | null };

/** One card's worth of entities: a single one, or several of a type. */
export type TEntityGroup = { key: string; type: string; refs: TEntityRef[] };

/**
 * The refs as cards: each on its own, but a type with more than `max` of them as one card, so
 * twelve validation results or four ion-channel models do not crowd out the rest. Duplicates
 * are dropped; the order of first appearance is kept.
 */
export function groupRefs(refs: TEntityRef[], max = 2): TEntityGroup[] {
  const unique = [...new Map(refs.map((r) => [r.id, r])).values()];
  const byType = new Map<string, TEntityRef[]>();
  for (const ref of unique) {
    const type = ref.type ?? '';
    byType.set(type, [...(byType.get(type) ?? []), ref]);
  }
  const groups: TEntityGroup[] = [];
  const done = new Set<string>();
  for (const ref of unique) {
    const type = ref.type ?? '';
    const same = byType.get(type) ?? [ref];
    if (same.length > max) {
      if (done.has(type)) continue;
      done.add(type);
      groups.push({ key: `group:${type}`, type, refs: same });
    } else {
      groups.push({ key: ref.id, type, refs: [ref] });
    }
  }
  return groups;
}

/** `IonChannelModelFromID` or `ion_channel_model` as "Ion channel model". */
export function refTypeLabel(type: string): string {
  const words = type
    .replace(/FromID$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .toLowerCase()
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Entity';
}

/** The settings blocks whose value names any of `ids`. */
export function blocksNaming(
  ids: string[],
  blocks: Array<{ id: string; value: unknown }>
): string[] {
  return blocks
    .filter(({ value }) => {
      const text = JSON.stringify(value ?? null);
      return ids.some((id) => text.includes(id));
    })
    .map(({ id }) => id);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID_KEY = /(^|_)id(_str)?$|_ids$/;

/**
 * The entity ids a block's value holds under an id-like key (`id_str`, `task_result_id`, …):
 * the inputs it picks that the config's model fields do not list, such as an optimisation's
 * target e-features.
 */
export function entityIdsIn(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) entityIdsIn(item, found);
  } else if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (ID_KEY.test(key) && typeof v === 'string' && UUID.test(v)) found.push(v);
      else if (ID_KEY.test(key) && Array.isArray(v))
        found.push(...v.filter((x): x is string => typeof x === 'string' && UUID.test(x)));
      else entityIdsIn(v, found);
    }
  }
  return found;
}
