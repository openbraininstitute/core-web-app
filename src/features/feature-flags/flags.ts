import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { config } from '@/config';
import { PanelState } from '@/ui/segments/ai/types';

import { defineFlag } from './define-flag';

export const aiPanelStateFlag = defineFlag<PanelState>({
  key: 'aiPanelState',
  defaultValue: PanelState.Collapsed,
  values: Object.values(PanelState),
  description: 'State of the AI panel',
  visible: false,
});

export const extractionActivityFlag = defineFlag<boolean>({
  key: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
  defaultValue: false,
  values: [true, false],
  description: 'Full extraction workflow',
  visible: () => ['local', 'preview'].includes(config.DEPLOYMENT_ENV),
});

export const brainRegionSimulationFlag = defineFlag<boolean>({
  key: 'brain-region-simulation',
  defaultValue: false,
  values: [true, false],
  description: 'Brain region simulations',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const extracellularRecordingArrayBuildFlag = defineFlag<boolean>({
  key: ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign,
  defaultValue: false,
  values: [true, false],
  description: 'Extracellular recording array build',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const smallScalesViaLaunchSystemFlag = defineFlag<boolean>({
  key: 'small-scales-via-launch-system',
  defaultValue: false,
  values: [true, false],
  description:
    'Launch single neuron, synaptome, paired neurons and small microcircuit simulations via the launch system',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** Interactive electrode overlays in circuit preview (independent of the build workflow). */
export const electrodeOverlaysFlag = defineFlag<boolean>({
  key: 'electrode-overlays',
  defaultValue: false,
  values: [true, false],
  description: 'Interactive electrode overlays in circuit preview',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** The morphology viewer's Debug menu: the statistics of the file and the mesh, and the mesh exports. */
export const morphologyDebugFlag = defineFlag<boolean>({
  key: 'morphology-debug',
  defaultValue: false,
  values: [true, false],
  description: 'Morphology viewer debug menu (statistics and mesh export)',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** The EM cell mesh viewer's Debug menu: the load's timings and memory, and how the mesh on show is chosen. */
export const emMeshDebugFlag = defineFlag<boolean>({
  key: 'em-mesh-debug',
  defaultValue: false,
  values: [true, false],
  description: 'EM cell mesh viewer debug menu (load timings, memory and mesh choice)',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** Learn: its tab in the project's top menu, its page of courses and the courses themselves. */
export const learnFlag = defineFlag<boolean>({
  key: 'learn',
  defaultValue: false,
  values: [true, false],
  description: 'Learn: free courses, each a deck of slides',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/** Each Learn course on its own; shown only while Learn is too. */
export const learnBrainModelingFlag = defineFlag<boolean>({
  key: 'learn-brain-modeling',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: Introduction to brain modeling',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnPythonFlag = defineFlag<boolean>({
  key: 'learn-python',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: How to code in Python',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnElectricalPhysicsFlag = defineFlag<boolean>({
  key: 'learn-electrical-physics',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: The electrical physics of a neuron',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnBasicElectricalPhysicsFlag = defineFlag<boolean>({
  key: 'learn-basic-electrical-physics',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: Basic electrical physics',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnElectricalPhysicsFirstTakeFlag = defineFlag<boolean>({
  key: 'learn-electrical-physics-first-take',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: The electrical physics of a neuron (first take)',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnNeurotransmittersFlag = defineFlag<boolean>({
  key: 'learn-neurotransmitters',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: Neurotransmitters',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnNeuronJaxleyFlag = defineFlag<boolean>({
  key: 'learn-neuron-vs-jaxley',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: NEURON and Jaxley',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnCorticalCellsFlag = defineFlag<boolean>({
  key: 'learn-cortical-cells',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: The cells of the cortex',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnPlatformFlag = defineFlag<boolean>({
  key: 'learn-platform',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: Introduction to the platform',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnEntitysdkFlag = defineFlag<boolean>({
  key: 'learn-entitysdk',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: How to use entitysdk',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnMiscFlag = defineFlag<boolean>({
  key: 'learn-misc',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: Miscellaneous',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnValidationFlag = defineFlag<boolean>({
  key: 'learn-validation',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: Simulations and validation',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnWhyModelFlag = defineFlag<boolean>({
  key: 'learn-why-model',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: Why model the brain?',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnMembraneBasicsFlag = defineFlag<boolean>({
  key: 'learn-membrane-basics',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: Charge, voltage and the membrane potential',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnCompartmentalNeuronFlag = defineFlag<boolean>({
  key: 'learn-compartmental-neuron',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: Compartmental neuron',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const learnSynapsePlasticityFlag = defineFlag<boolean>({
  key: 'learn-synapse-plasticity',
  defaultValue: true,
  values: [true, false],
  description: 'Learn course: Plasticity at a synapse',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/**
 * Help: its button in the project's top menu and its page. On by default, so nothing changes until
 * it is switched off, e.g. once Learn has taken over what Help holds.
 */
export const helpFlag = defineFlag<boolean>({
  key: 'help',
  defaultValue: true,
  values: [true, false],
  description: 'Help: the top menu button and the Help page',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/**
 * The AI assistant without its rail down the right: a round "AI" button at the end of the top menu
 * opens it, and closing it gives the width back to the page.
 */
export const aiButtonFlag = defineFlag<boolean>({
  key: 'ai-button',
  defaultValue: false,
  values: [true, false],
  description: 'AI assistant: a round "AI" button in the top menu instead of the side rail',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/**
 * The Learn page's appearance options, for judging designs: a gear in the corner of its card that
 * opens them. On by default outside production, where it cannot be switched on.
 */
export const learnAppearanceFlag = defineFlag<boolean>({
  key: 'learn-appearance',
  defaultValue: ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
  values: [true, false],
  description: 'Learn: the appearance options behind a gear on the card (for judging designs)',
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

/**
 * The project's top bar drawn as the courses' bar is: a white strip with a hairline under it and the
 * OBI logo at its left, the sections as words with a line under the active one.
 */
export const courseToolbarFlag = defineFlag<boolean>({
  key: 'course-style-toolbar',
  defaultValue: false,
  values: [true, false],
  description: "Top bar: drawn in the style of the Learn courses' bar",
  visible: () => ['local', 'preview', 'staging'].includes(config.DEPLOYMENT_ENV),
});

export const flags = [
  aiPanelStateFlag,
  extractionActivityFlag,
  brainRegionSimulationFlag,
  extracellularRecordingArrayBuildFlag,
  smallScalesViaLaunchSystemFlag,
  electrodeOverlaysFlag,
  morphologyDebugFlag,
  emMeshDebugFlag,
  learnFlag,
  learnBrainModelingFlag,
  learnPythonFlag,
  learnElectricalPhysicsFlag,
  learnValidationFlag,
  learnSynapsePlasticityFlag,
  learnCompartmentalNeuronFlag,
  learnMembraneBasicsFlag,
  learnWhyModelFlag,
  learnBasicElectricalPhysicsFlag,
  learnElectricalPhysicsFirstTakeFlag,
  learnNeurotransmittersFlag,
  learnNeuronJaxleyFlag,
  learnCorticalCellsFlag,
  learnPlatformFlag,
  learnEntitysdkFlag,
  learnMiscFlag,
  helpFlag,
  aiButtonFlag,
  learnAppearanceFlag,
  courseToolbarFlag,
] as const;

export type FlagKey = (typeof flags)[number]['key'];

export const hasVisibleFlags = flags.some((flag) =>
  typeof flag.visible === 'boolean' ? flag.visible : flag.visible?.()
);

export type FeatureFlags = {
  [K in (typeof flags)[number] as K['key']]: K['defaultValue'];
};
