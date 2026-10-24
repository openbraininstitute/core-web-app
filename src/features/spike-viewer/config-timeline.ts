/** When something the simulation's config sets up happens: a stimulus, a recording, a change to synapses. */
export type TimelineEvent = {
  kind: 'stimulus' | 'recording' | 'manipulation';
  name: string;
  /** Onset, in ms. */
  start: number;
  /** Offset, in ms; absent for what holds from its onset on. */
  end?: number;
  /** What it is, in a few words: the input's type and node set, what is recorded. */
  detail?: string;
};

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const numberOf = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const textOf = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined);
const joined = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ') || undefined;

/**
 * The timings a SONATA simulation config sets: each input from its `delay`
 * for its `duration`, each report from `start_time` to `end_time`, and each
 * connection override from its `delay` on. In onset order.
 */
export function configTimeline(config: unknown): TimelineEvent[] {
  if (!isObject(config)) return [];
  const tstop = isObject(config.run) ? numberOf(config.run.tstop) : undefined;
  const events: TimelineEvent[] = [];

  for (const [name, input] of Object.entries(isObject(config.inputs) ? config.inputs : {})) {
    if (!isObject(input)) continue;
    const start = numberOf(input.delay) ?? 0;
    const duration = numberOf(input.duration);
    events.push({
      kind: 'stimulus',
      name,
      start,
      end: duration === undefined ? tstop : start + duration,
      detail: joined(textOf(input.input_type)?.replace(/_/g, ' '), textOf(input.node_set)),
    });
  }

  for (const [name, report] of Object.entries(isObject(config.reports) ? config.reports : {})) {
    if (!isObject(report)) continue;
    events.push({
      kind: 'recording',
      name,
      start: numberOf(report.start_time) ?? 0,
      end: numberOf(report.end_time) ?? tstop,
      detail: joined(textOf(report.variable_name), textOf(report.cells)),
    });
  }

  const overrides = Array.isArray(config.connection_overrides) ? config.connection_overrides : [];
  for (const override of overrides) {
    if (!isObject(override)) continue;
    const source = textOf(override.source);
    const target = textOf(override.target);
    const weight = numberOf(override.weight);
    events.push({
      kind: 'manipulation',
      name: textOf(override.name) ?? 'Connection override',
      start: numberOf(override.delay) ?? 0,
      detail: joined(
        source && target ? `${source} → ${target}` : undefined,
        weight === undefined ? undefined : `weight × ${weight}`
      ),
    });
  }

  return events.sort((a, b) => a.start - b.start);
}
