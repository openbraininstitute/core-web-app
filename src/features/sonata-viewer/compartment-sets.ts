import { describeBlock } from '@/features/spike-viewer/config-timeline';

import type { PopulationMetadata } from '@/features/sonata-viewer/types';
import type { TimelineBlock, TimelineSchema } from '@/features/spike-viewer/config-timeline';

/** A location of a compartment set: the cell, the section, and how far along it, 0 to 1. */
export type CompartmentLocation = [nodeId: number, sectionId: number, offset: number];

/** A compartment set of the simulation's, as its compartment sets file and its single config say. */
export type SimulationCompartmentSet = {
  population: string;
  locations: CompartmentLocation[];
  /** The morphology locations block it was made from, described; null where the config has none. */
  block: TimelineBlock | null;
  /** The stimuli and recordings that target it, by name. */
  usedBy: { kind: 'Stimulus' | 'Recording'; name: string }[];
};

/** The simulation's compartment sets by name, the name of the block each was made from. */
export type SimulationCompartmentSets = Readonly<Record<string, SimulationCompartmentSet>>;

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * The compartment sets of a simulation's compartment sets file, each with the morphology
 * locations block of its single config it was made from, and what uses it there.
 */
export function simulationCompartmentSets(
  file: unknown,
  single: unknown,
  schema?: TimelineSchema | null
): SimulationCompartmentSets | null {
  if (!isObject(file)) return null;
  const config = isObject(single) ? single : null;
  const blocks = config && isObject(config.morphology_locations) ? config.morphology_locations : {};
  const sets: Record<string, SimulationCompartmentSet> = {};
  for (const [name, set] of Object.entries(file)) {
    if (!isObject(set) || !Array.isArray(set.compartment_set)) continue;
    const locations = set.compartment_set.filter(
      (entry): entry is CompartmentLocation =>
        Array.isArray(entry) && entry.length === 3 && entry.every((v) => typeof v === 'number')
    );
    sets[name] = {
      population: typeof set.population === 'string' ? set.population : '',
      locations,
      block: isObject(blocks[name])
        ? describeBlock(
            'morphology_locations',
            blocks[name],
            'Morphology locations',
            config,
            schema ?? null
          )
        : null,
      usedBy: config ? usersOf(config, name) : [],
    };
  }
  return sets;
}

/** The stimuli and recordings of a single config that target the morphology locations `name`. */
function usersOf(config: Json, name: string): SimulationCompartmentSet['usedBy'] {
  const users: SimulationCompartmentSet['usedBy'] = [];
  const sections = [
    ['stimuli', 'Stimulus'],
    ['recordings', 'Recording'],
  ] as const;
  for (const [section, kind] of sections) {
    const blocks = isObject(config[section]) ? config[section] : {};
    for (const [blockName, block] of Object.entries(blocks)) {
      if (!isObject(block)) continue;
      const targets = Object.values(block).some(
        (value) =>
          isObject(value) &&
          value.block_dict_name === 'morphology_locations' &&
          value.block_name === name
      );
      if (targets) users.push({ kind, name: blockName });
    }
  }
  return users;
}

/**
 * Where each of a report's compartments is in a compartment set, by trace: its offset along
 * its section. A cell's columns in a section take the set's locations there in turn.
 */
export function compartmentOffsets(
  population: PopulationMetadata,
  set: SimulationCompartmentSet
): Map<number, number> {
  const queues = new Map<string, number[]>();
  for (const [nodeId, sectionId, offset] of set.locations) {
    const key = `${nodeId}:${sectionId}`;
    const queue = queues.get(key);
    if (queue) queue.push(offset);
    else queues.set(key, [offset]);
  }
  const offsets = new Map<number, number>();
  population.traces.forEach((trace, traceIndex) => {
    if (trace.elementId === null) return;
    const offset = queues.get(`${trace.nodeId}:${trace.elementId}`)?.shift();
    if (offset !== undefined) offsets.set(traceIndex, offset);
  });
  return offsets;
}

/**
 * A compartment set as columns of its compartments' table: its name, the type of the block
 * it was made from and each of that block's settings, and the stimuli and recordings
 * targeting it.
 */
export function compartmentSetColumns(
  name: string,
  set: SimulationCompartmentSet
): { label: string; value: string }[] {
  const namesOf = (kind: SimulationCompartmentSet['usedBy'][number]['kind']) =>
    set.usedBy
      .filter((u) => u.kind === kind)
      .map((u) => u.name)
      .join(', ');
  return [
    { label: 'Compartment set', value: name },
    ...(set.block ? [{ label: 'Type', value: set.block.title }, ...set.block.fields] : []),
    { label: 'Stimuli', value: namesOf('Stimulus') },
    { label: 'Recordings', value: namesOf('Recording') },
  ];
}
