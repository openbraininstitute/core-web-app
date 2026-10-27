/** A config block, described for a reader: what kind it is, and each of its settings. */
export type TimelineBlock = {
  /** The block type's title, such as "Constant Current Clamp (Absolute)". */
  title: string;
  fields: { label: string; value: string }[];
};

/** When something the simulation's config sets up happens: a stimulus, a recording, a change. */
export type TimelineEvent = {
  kind: 'stimulus' | 'recording' | 'manipulation';
  /** The block's name. */
  name: string;
  /** Onset, in ms. */
  start: number;
  /** Offset, in ms; the onset for an instant, absent for what holds from its onset on. */
  end?: number;
  block: TimelineBlock;
};

/**
 * Enough of an obi-one scan-config schema to name a block's type and fields:
 * each block dictionary's types, with their titles and their fields' titles
 * and units.
 */
export type TimelineSchema = {
  properties: Record<string, unknown>;
};

type Json = Record<string, unknown>;
type FieldSchema = { title?: string; units?: string; ui_hidden?: boolean };
type TypeSchema = { title?: string; properties?: Record<string, FieldSchema & { const?: string }> };

const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const numberOf = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const textOf = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined);

/**
 * The timings of a simulation, read from its obi-one single config where it
 * has one - a stimulus at each of its timestamps plus its offset, for its
 * duration, or at an instant where it has none - and from its SONATA config
 * otherwise: inputs from `delay` for `duration`, reports from `start_time` to
 * `end_time`, connection overrides from `delay` on. Each carries its block,
 * described with the schema's titles and units where given. In onset order.
 */
export function configTimeline(
  sonata: unknown,
  coordinate?: unknown,
  schema?: TimelineSchema | null
): TimelineEvent[] {
  const config = isObject(sonata) ? sonata : {};
  const single = isObject(coordinate) ? coordinate : null;
  const tstop =
    (isObject(config.run) ? numberOf(config.run.tstop) : undefined) ??
    (single && isObject(single.initialize)
      ? numberOf(single.initialize.simulation_length)
      : undefined);
  const describe = (section: string, block: unknown, fallbackTitle: string) =>
    describeBlock(section, block, fallbackTitle, single, schema ?? null);
  const events: TimelineEvent[] = [];

  // Stimuli: the single config knows when each fires; SONATA only how its input is wired,
  // which for a spike replay spans the whole run whatever its timestamps.
  const stimuli = single && isObject(single.stimuli) ? single.stimuli : null;
  if (single && stimuli) {
    for (const [name, block] of Object.entries(stimuli)) {
      if (!isObject(block)) continue;
      const offset = numberOf(block.timestamp_offset) ?? 0;
      const duration = numberOf(block.duration);
      const details = describe('stimuli', block, 'Stimulus');
      for (const at of timestampsOf(block.timestamps, single)) {
        const start = at + offset;
        if (start < 0) continue;
        events.push({
          kind: 'stimulus',
          name,
          start,
          end: duration === undefined ? start : Math.min(start + duration, tstop ?? Infinity),
          block: details,
        });
      }
    }
  } else if (isObject(config.inputs)) {
    for (const [name, input] of Object.entries(config.inputs)) {
      if (!isObject(input)) continue;
      const start = numberOf(input.delay) ?? 0;
      const duration = numberOf(input.duration);
      events.push({
        kind: 'stimulus',
        name,
        start,
        end: duration === undefined ? tstop : start + duration,
        block: describe('', input, textOf(input.input_type)?.replace(/_/g, ' ') ?? 'Input'),
      });
    }
  }

  const recordings = single && isObject(single.recordings) ? single.recordings : {};
  if (isObject(config.reports)) {
    for (const [name, report] of Object.entries(config.reports)) {
      if (!isObject(report)) continue;
      events.push({
        kind: 'recording',
        name,
        start: numberOf(report.start_time) ?? 0,
        end: numberOf(report.end_time) ?? tstop,
        block: isObject(recordings[name])
          ? describe('recordings', recordings[name], 'Recording')
          : describe('', report, 'Report'),
      });
    }
  }

  // Synaptic changes from their override's delay on; any the overrides do not name, and the
  // neuronal ones, from the start.
  const synaptic =
    single && isObject(single.synaptic_manipulations) ? single.synaptic_manipulations : {};
  const overridden = new Set<string>();
  const overrides = Array.isArray(config.connection_overrides) ? config.connection_overrides : [];
  for (const override of overrides) {
    if (!isObject(override)) continue;
    const name = textOf(override.name) ?? 'Connection override';
    overridden.add(name);
    events.push({
      kind: 'manipulation',
      name,
      start: numberOf(override.delay) ?? 0,
      block: isObject(synaptic[name])
        ? describe('synaptic_manipulations', synaptic[name], 'Synaptic manipulation')
        : describe('', override, 'Connection override'),
    });
  }
  for (const [name, block] of Object.entries(synaptic)) {
    if (overridden.has(name) || !isObject(block)) continue;
    events.push({
      kind: 'manipulation',
      name,
      start: 0,
      block: describe('synaptic_manipulations', block, 'Synaptic manipulation'),
    });
  }
  const neuronal =
    single && isObject(single.neuronal_manipulations) ? single.neuronal_manipulations : {};
  for (const [name, block] of Object.entries(neuronal)) {
    if (!isObject(block)) continue;
    events.push({
      kind: 'manipulation',
      name,
      start: 0,
      block: describe('neuronal_manipulations', block, 'Neuronal manipulation'),
    });
  }

  return events.sort((a, b) => a.start - b.start);
}

/** A stimulus's timestamps block, resolved by reference; none means once, at 0. */
function timestampsOf(reference: unknown, single: Json): number[] {
  const name = isObject(reference) ? textOf(reference.block_name) : undefined;
  const blocks = isObject(single.timestamps) ? single.timestamps : {};
  const block = name ? blocks[name] : undefined;
  if (!isObject(block)) return [0];
  const start = numberOf(block.start_time) ?? 0;
  const interval = numberOf(block.interval);
  const repetitions = numberOf(block.number_of_repetitions);
  if (interval !== undefined && repetitions !== undefined) {
    return Array.from(
      { length: Math.max(0, Math.floor(repetitions)) },
      (_, i) => start + i * interval
    );
  }
  return [start];
}

/**
 * A block's type and every setting it has, in the schema's order, with its
 * titles and units; references by the name of the block they point at, and a
 * timestamps reference with its times.
 */
function describeBlock(
  section: string,
  block: unknown,
  fallbackTitle: string,
  single: Json | null,
  schema: TimelineSchema | null
): TimelineBlock {
  if (!isObject(block)) return { title: fallbackTitle, fields: [] };
  const typeName = textOf(block.type);
  const typeSchema = typeName ? typeSchemaOf(schema, section, typeName) : null;
  const props = typeSchema?.properties ?? {};
  const keys = [
    ...Object.keys(props).filter((k) => k in block),
    ...Object.keys(block).filter((k) => !(k in props)),
  ];
  const fields: TimelineBlock['fields'] = [];
  for (const key of keys) {
    if (key === 'type' || props[key]?.ui_hidden) continue;
    const value = block[key];
    const units = props[key]?.units;
    let text = valueText(value, units);
    if (key === 'timestamps' && single) {
      const times = timestampsOf(value, single);
      const shown = times
        .slice(0, 4)
        .map((t) => `${round(t)} ms`)
        .join(', ');
      text = `${text} · ${shown}${times.length > 4 ? ` … (${times.length})` : ''}`;
    }
    fields.push({ label: props[key]?.title ?? sentence(key), value: text });
  }
  return { title: typeSchema?.title ?? (typeName ? spaced(typeName) : fallbackTitle), fields };
}

function typeSchemaOf(
  schema: TimelineSchema | null,
  section: string,
  typeName: string
): TypeSchema | null {
  const dictionary = schema?.properties?.[section];
  if (!isObject(dictionary) || !isObject(dictionary.additionalProperties)) return null;
  const types = dictionary.additionalProperties.oneOf;
  if (!Array.isArray(types)) return null;
  const match = types.find(
    (t) =>
      isObject(t) &&
      isObject(t.properties) &&
      isObject(t.properties.type) &&
      t.properties.type.const === typeName
  );
  return isObject(match) ? (match as TypeSchema) : null;
}

function valueText(value: unknown, units: string | undefined): string {
  if (value === null || value === undefined) return 'Default';
  if (typeof value === 'number') return units ? `${round(value)} ${units}` : `${round(value)}`;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((v) => valueText(v, units)).join(', ');
  if (isObject(value)) {
    const named = textOf(value.block_name) ?? textOf(value.id_str) ?? textOf(value.name);
    if (named) return named;
    return Object.entries(value)
      .filter(([k]) => k !== 'type')
      .map(([k, v]) => `${sentence(k)} ${valueText(v, undefined)}`)
      .join(' · ');
  }
  return String(value);
}

const round = (v: number) => (Number.isInteger(v) ? `${v}` : `${Number(v.toPrecision(4))}`);
/** `timestamp_offset` as "Timestamp offset". */
const sentence = (key: string) => {
  const words = key.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
/** `ConstantCurrentClampSomaticStimulus` as "Constant current clamp somatic stimulus". */
const spaced = (type: string) =>
  sentence(type.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase());
