import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkflowActivityDictValue } from '@/constants';
import {
  brainRegionSimulationFlag,
  extracellularRecordingArrayBuildFlag,
  extractionActivityFlag,
} from '@/features/feature-flags/flags';
import {
  readWorkflowSessionSelection,
  WorkflowSessionSelectionMode,
} from '@/features/scan-config/workflow/workflow-session-selection';
import { ActivityRegistry } from '@/ui/segments/workflows/config/activities';
import { resolveWorkflowConfigureHrefForEntity } from '@/ui/segments/workflows/config/entity-entry';

import type { TCircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { FeatureFlags } from '@/features/feature-flags/flags';
import type { TActivityValue } from '@/ui/segments/workflows/config/types';

const { getEntity, getCircuit, getSimulationCampaign, getTaskConfig } = vi.hoisted(() => ({
  getEntity: vi.fn(),
  getCircuit: vi.fn(),
  getSimulationCampaign: vi.fn(),
  getTaskConfig: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/general/entity', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getEntity,
}));
vi.mock('@/api/entitycore/queries/model/circuit', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCircuit,
}));
vi.mock('@/api/entitycore/queries/simulation/campaign', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSimulationCampaign,
}));
vi.mock('@/api/entitycore/queries/task/task-config', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getTaskConfig,
}));

const workspace = { virtualLabId: 'lab-1', projectId: 'project-1' };

/** every flag on, so flag-gated workflows are reachable in the table below */
const allFlags = {
  [extractionActivityFlag.key]: true,
  [brainRegionSimulationFlag.key]: true,
  [extracellularRecordingArrayBuildFlag.key]: true,
} as FeatureFlags;

const ENTITY_ID = 'entity-id';
const INPUT_ID = 'input-id';

type TFixture = {
  /** the entity the link points at */
  entity: { type: TEntityTypeDict; scale?: TCircuitScaleDictionary };
  /** entity referenced by a simulation campaign, or by a task config's first input */
  input?: { type: TEntityTypeDict; scale?: TCircuitScaleDictionary };
  taskConfigType?: string;
};

type TCase = {
  name: string;
  fixture: TFixture;
  /** workflow this entity must land in — also what the coverage guard counts */
  covers: { activity: TActivityValue; targetType: TExtendedEntitiesTypeDict };
  /** full expected href, `{session}` standing in for a generated `wf_*` id */
  href: string;
  /** entity the configure session must be seeded with, when the workflow browses one */
  selects?: { type: TExtendedEntitiesTypeDict; id: string };
  /** defaults to every flag on */
  flags?: FeatureFlags;
};

const base = `/app/virtual-lab/${workspace.virtualLabId}/${workspace.projectId}/workflows`;
const { build, simulate, extract, process } = WorkflowActivityDictValue;

const cases: TCase[] = [
  // source models: a new configure session, entity pre-selected ───
  {
    name: 'ME-model → single neuron (beta) simulation',
    fixture: { entity: { type: EntityTypeDict.Memodel } },
    covers: { activity: simulate, targetType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation },
    href: `${base}/simulate/configure/me-model-circuit-simulation/{session}?panel=configuration`,
    selects: { type: ExtendedEntitiesTypeDict.MemodelCircuit, id: ENTITY_ID },
  },
  {
    // static-type workflow: its editor picks the ion channel models itself, so the route carries
    // no session id and no pre-selection
    name: 'ion channel model → ion channel simulation',
    fixture: { entity: { type: EntityTypeDict.IonChannelModel } },
    covers: {
      activity: simulate,
      targetType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
    },
    href: `${base}/simulate/configure/ion-channel-model-simulation?panel=configuration`,
  },
  {
    name: 'single-neuron circuit → synaptome (beta) simulation',
    fixture: { entity: { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single } },
    covers: {
      activity: simulate,
      targetType: ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
    },
    href: `${base}/simulate/configure/single-neuron-circuit-simulation/{session}?panel=configuration`,
    selects: { type: ExtendedEntitiesTypeDict.SingleNeuronCircuit, id: ENTITY_ID },
  },
  {
    name: 'paired-neuron circuit → paired neurons simulation',
    fixture: { entity: { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.PairNeuron } },
    covers: {
      activity: simulate,
      targetType: ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
    },
    href: `${base}/simulate/configure/paired-neuron-circuit-simulation/{session}?panel=configuration`,
    selects: { type: ExtendedEntitiesTypeDict.PairedNeuronCircuit, id: ENTITY_ID },
  },
  {
    name: 'small microcircuit → small microcircuit simulation',
    fixture: {
      entity: { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.SmallMicrocircuit },
    },
    covers: {
      activity: simulate,
      targetType: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
    },
    href: `${base}/simulate/configure/small-microcircuit-simulation/{session}?panel=configuration`,
    selects: { type: ExtendedEntitiesTypeDict.SmallMicrocircuit, id: ENTITY_ID },
  },
  {
    name: 'microcircuit → microcircuit simulation',
    fixture: {
      entity: { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Microcircuit },
    },
    covers: { activity: simulate, targetType: ExtendedEntitiesTypeDict.MicrocircuitSimulation },
    href: `${base}/simulate/configure/microcircuit-simulation/{session}?panel=configuration`,
    selects: { type: ExtendedEntitiesTypeDict.Microcircuit, id: ENTITY_ID },
  },
  {
    name: 'region circuit → brain region simulation',
    fixture: { entity: { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Region } },
    covers: { activity: simulate, targetType: ExtendedEntitiesTypeDict.RegionCircuitSimulation },
    href: `${base}/simulate/configure/region-circuit-simulation/{session}?panel=configuration`,
    selects: { type: ExtendedEntitiesTypeDict.BrainRegion, id: ENTITY_ID },
  },
  {
    name: 'whole-brain circuit → whole brain simulation',
    fixture: { entity: { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.WholeBrain } },
    covers: {
      activity: simulate,
      targetType: ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation,
    },
    href: `${base}/simulate/configure/whole-brain-circuit-simulation/{session}?panel=configuration`,
    selects: { type: ExtendedEntitiesTypeDict.WholeBrain, id: ENTITY_ID },
  },
  {
    name: 'EM cell mesh → skeletonization',
    fixture: { entity: { type: EntityTypeDict.EMCellMesh } },
    covers: { activity: process, targetType: ExtendedEntitiesTypeDict.SkeletonizationCampaign },
    href: `${base}/process/configure/skeletonization-campaign/{session}`,
    selects: { type: ExtendedEntitiesTypeDict.EMCellMesh, id: ENTITY_ID },
  },
  {
    // a circuit with no scale matches no simulation, so it falls to the activities that take a
    // circuit whatever its scale — build before extract, following activity order
    name: 'scale-less circuit → recording array build',
    fixture: { entity: { type: EntityTypeDict.Circuit } },
    covers: {
      activity: build,
      targetType: ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign,
    },
    href: `${base}/build/configure/extracellular-recording-array-campaign/{session}`,
    selects: { type: ExtendedEntitiesTypeDict.Circuit, id: ENTITY_ID },
  },
  {
    name: 'scale-less circuit → circuit extraction when only extraction is enabled',
    fixture: { entity: { type: EntityTypeDict.Circuit } },
    covers: { activity: extract, targetType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign },
    href: `${base}/extract/configure/circuit-extraction-campaign/{session}`,
    selects: { type: ExtendedEntitiesTypeDict.Circuit, id: ENTITY_ID },
    flags: { [extractionActivityFlag.key]: true } as FeatureFlags,
  },

  // legacy browse-first workflows: configure keyed by the entity itself ───
  {
    name: 'synaptome → single neuron synaptome simulation',
    fixture: { entity: { type: EntityTypeDict.SingleNeuronSynaptome } },
    covers: {
      activity: simulate,
      targetType: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
    },
    href: `${base}/simulate/configure/single-neuron-synaptome/${ENTITY_ID}?panel=configuration&session={session}`,
  },

  // activity outputs: reopen the run that produced them ───
  {
    name: 'EM synapse mapping campaign reopens its own configuration',
    fixture: { entity: { type: EntityTypeDict.EmSynapseMappingCampaign } },
    covers: { activity: build, targetType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign },
    href: `${base}/build/configure/em-synapse-mapping-campaign/{session}?origin=${ENTITY_ID}`,
  },
  {
    name: 'ion channel modeling campaign falls back to its detail view',
    fixture: { entity: { type: EntityTypeDict.IonChannelModelingCampaign } },
    covers: { activity: build, targetType: ExtendedEntitiesTypeDict.IonChannelModelingCampaign },
    href: `${base}/view/ion-channel-modeling-campaign/${ENTITY_ID}/overview`,
  },
  {
    name: 'legacy single neuron simulation falls back to its detail view',
    fixture: { entity: { type: EntityTypeDict.SingleNeuronSimulation } },
    covers: { activity: simulate, targetType: ExtendedEntitiesTypeDict.SingleNeuronSimulation },
    href: `${base}/view/single-neuron-simulation/${ENTITY_ID}/configuration`,
  },

  // simulation campaigns: resolved through the model they ran on ───
  {
    name: 'ME-model campaign → single neuron (beta) editor',
    fixture: {
      entity: { type: EntityTypeDict.SimulationCampaign },
      input: { type: EntityTypeDict.Memodel },
    },
    covers: { activity: simulate, targetType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation },
    href: `${base}/simulate/configure/me-model-circuit-simulation/{session}?origin=${ENTITY_ID}`,
  },
  {
    name: 'circuit campaign → editor matching the circuit scale',
    fixture: {
      entity: { type: EntityTypeDict.SimulationCampaign },
      input: { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Microcircuit },
    },
    covers: { activity: simulate, targetType: ExtendedEntitiesTypeDict.MicrocircuitSimulation },
    href: `${base}/simulate/configure/microcircuit-simulation/{session}?origin=${ENTITY_ID}`,
  },
  {
    name: 'ion channel campaign → ion channel editor',
    fixture: {
      entity: { type: EntityTypeDict.SimulationCampaign },
      input: { type: EntityTypeDict.IonChannelModel },
    },
    covers: {
      activity: simulate,
      targetType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
    },
    href: `${base}/simulate/configure/ion-channel-model-simulation?origin=${ENTITY_ID}`,
  },

  // task-config campaigns: matched through the workflow's task bindings ───
  {
    name: 'extraction task config → extract editor',
    fixture: {
      entity: { type: EntityTypeDict.TaskConfig },
      input: { type: EntityTypeDict.Circuit },
      taskConfigType: TaskConfigType.CircuitExtractionCampaign,
    },
    covers: { activity: extract, targetType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign },
    href: `${base}/extract/configure/circuit-extraction-campaign/{session}?origin=${ENTITY_ID}`,
  },
  {
    name: 'skeletonization task config → process editor',
    fixture: {
      entity: { type: EntityTypeDict.TaskConfig },
      input: { type: EntityTypeDict.EMCellMesh },
      taskConfigType: TaskConfigType.SkeletonizationCampaign,
    },
    covers: { activity: process, targetType: ExtendedEntitiesTypeDict.SkeletonizationCampaign },
    href: `${base}/process/configure/skeletonization-campaign/{session}?origin=${ENTITY_ID}`,
  },
  {
    name: 'EM synapse mapping task config → build editor',
    fixture: {
      entity: { type: EntityTypeDict.TaskConfig },
      input: { type: EntityTypeDict.Memodel },
      taskConfigType: TaskConfigType.EmSynapseMappingCampaign,
    },
    covers: { activity: build, targetType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign },
    href: `${base}/build/configure/em-synapse-mapping-campaign/{session}?origin=${ENTITY_ID}`,
  },
  {
    name: 'recording-array task config → build editor',
    fixture: {
      entity: { type: EntityTypeDict.TaskConfig },
      input: { type: EntityTypeDict.Circuit },
      taskConfigType: TaskConfigType.ExtracellularRecordingWeightsCalculationCampaign,
    },
    covers: {
      activity: build,
      targetType: ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign,
    },
    href: `${base}/build/configure/extracellular-recording-array-campaign/{session}?origin=${ENTITY_ID}`,
  },
  {
    name: 'circuit simulation task config picks the workflow matching its input scale',
    fixture: {
      entity: { type: EntityTypeDict.TaskConfig },
      input: { type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Microcircuit },
      taskConfigType: TaskConfigType.CircuitSimulationCampaign,
    },
    covers: { activity: simulate, targetType: ExtendedEntitiesTypeDict.MicrocircuitSimulation },
    href: `${base}/simulate/configure/microcircuit-simulation/{session}?origin=${ENTITY_ID}`,
  },
];

/**
 * workflows no entity id can reach, because the type they consume resolves to another workflow
 * first: an ME-model opens the simulation editor, a synaptome likewise. Their build editors are
 * reached from the workflows page, not from an entity link
 */
const UNREACHABLE_FROM_AN_ENTITY_ID: ReadonlySet<string> = new Set([
  `${build}/${ExtendedEntitiesTypeDict.Memodel}`,
  `${build}/${ExtendedEntitiesTypeDict.SingleNeuronSynaptome}`,
]);

function applyFixture(fixture: TFixture) {
  getEntity.mockImplementation(async ({ id }: { id: string }) => {
    const entity = id === ENTITY_ID ? fixture.entity : fixture.input;
    return { id, type: entity?.type };
  });
  getCircuit.mockImplementation(async ({ id }: { id: string }) => {
    const entity = id === ENTITY_ID ? fixture.entity : fixture.input;
    return { id, scale: entity?.scale };
  });
  getSimulationCampaign.mockResolvedValue({ id: ENTITY_ID, entity_id: INPUT_ID });
  getTaskConfig.mockResolvedValue({
    id: ENTITY_ID,
    task_config_type: fixture.taskConfigType,
    inputs: fixture.input ? [{ id: INPUT_ID, type: fixture.input.type }] : [],
  });
}

/** replaces the generated `wf_*` session id with `{session}` so hrefs compare literally */
function normalizeSession(href: string): string {
  return href.replace(/wf_[a-z0-9]+/, '{session}');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveWorkflowConfigureHrefForEntity', () => {
  it.each(cases)('$name', async ({ fixture, href, selects, flags }) => {
    applyFixture(fixture);

    const resolved = await resolveWorkflowConfigureHrefForEntity({
      entityId: ENTITY_ID,
      workspace,
      flags: flags ?? allFlags,
    });

    expect(resolved).not.toBeNull();
    expect(normalizeSession(resolved as string)).toBe(href);

    if (selects) {
      const sessionId = (resolved as string).match(/wf_[a-z0-9]+/)?.[0];
      expect(readWorkflowSessionSelection(sessionId as string)).toEqual({
        mode: WorkflowSessionSelectionMode.Single,
        item: selects,
      });
    }
  });

  it('covers every workflow an entity id can reach', () => {
    const covered = new Set(cases.map(({ covers }) => `${covers.activity}/${covers.targetType}`));

    const uncovered = Object.values(ActivityRegistry).flatMap((activity) =>
      activity.workflows
        .filter((workflow) => !workflow.disabled)
        .map((workflow) => `${activity.value}/${workflow.targetType}`)
        .filter((key) => !covered.has(key) && !UNREACHABLE_FROM_AN_ENTITY_ID.has(key))
    );

    expect(uncovered).toEqual([]);
  });

  it('skips workflows the user has no feature flag for', async () => {
    applyFixture({ entity: { type: EntityTypeDict.Circuit } });

    await expect(
      resolveWorkflowConfigureHrefForEntity({ entityId: ENTITY_ID, workspace })
    ).resolves.toBeNull();
  });

  it('returns null when no workflow accepts the entity', async () => {
    applyFixture({ entity: { type: EntityTypeDict.Subject } });

    await expect(
      resolveWorkflowConfigureHrefForEntity({ entityId: ENTITY_ID, workspace, flags: allFlags })
    ).resolves.toBeNull();
  });
});
