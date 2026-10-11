import {
  learnBasicElectricalPhysicsFlag,
  learnBrainModelingFlag,
  learnCorticalCellsFlag,
  learnElectricalPhysicsFirstTakeFlag,
  learnElectricalPhysicsFlag,
  learnEntitysdkFlag,
  learnMiscFlag,
  learnNeuronJaxleyFlag,
  learnNeurotransmittersFlag,
  learnPlatformFlag,
  learnPythonFlag,
  learnValidationFlag,
} from '@/features/feature-flags';
import { BASIC_ELECTRICAL_PHYSICS_SLIDES } from '@/features/learn/slides/basic-electrical-physics';
import { BRAIN_MODELING_SLIDES } from '@/features/learn/slides/brain-modeling';
import { CORTICAL_CELLS_SLIDES } from '@/features/learn/slides/cortical-cells';
import { ELECTRICAL_PHYSICS_SLIDES } from '@/features/learn/slides/electrical-physics';
import { ELECTRICAL_PHYSICS_FIRST_TAKE_SLIDES } from '@/features/learn/slides/electrical-physics-first-take';
import { ENTITYSDK_SLIDES } from '@/features/learn/slides/entitysdk';
import { MISC_SLIDES } from '@/features/learn/slides/misc';
import { NEURON_VS_JAXLEY_SLIDES } from '@/features/learn/slides/neuron-vs-jaxley';
import { NEUROTRANSMITTERS_SLIDES } from '@/features/learn/slides/neurotransmitters';
import { PLATFORM_SLIDES } from '@/features/learn/slides/platform';
import { PYTHON_SLIDES } from '@/features/learn/slides/python';
import { VALIDATION_SLIDES } from '@/features/learn/slides/validation';

import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

export type LearnLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'All levels';

/** A course in Learn: for now, one deck of slides. */
export type LearnCourse = {
  /** Its URL segment, and its key in the learner's progress. */
  id: string;
  title: string;
  level: LearnLevel;
  description: string;
  /** The key of the feature flag that shows it. */
  flag: string;
  slides: Slide[];
  /** Brought over from the learn app as it was: listed apart, under "Rough / Misc". */
  rough?: boolean;
  /** The figure the Learn page shows of it, live: one of its slides' own. */
  preview: NonNullable<Slide['widget']>;
};

export const LEARN_COURSES: LearnCourse[] = [
  {
    id: 'brain-modeling',
    title: 'Introduction to brain modeling',
    level: 'Beginner',
    description:
      'From whole brains down to a patch of membrane: the cells brains are made of and the many kinds of neuron, how neurons communicate to drive behaviour and change as an animal learns, the three parts of a neuron, and how charge on a dendrite’s membrane makes a voltage.',
    flag: learnBrainModelingFlag.key,
    slides: BRAIN_MODELING_SLIDES,
    // slide 1's, the course's first figure: the whole brain
    preview: 'brain',
  },
  {
    id: 'python',
    title: 'How to code in Python',
    level: 'Beginner',
    description:
      'Python from a first line to a simulated neuron: variables, lists, loops, functions and NumPy, every example runnable in the page.',
    flag: learnPythonFlag.key,
    slides: PYTHON_SLIDES,
    // slide 1's: a cell to edit and run
    preview: 'python:hello',
  },
  {
    id: 'electrical-physics',
    title: 'The electrical physics of a neuron',
    level: 'Beginner',
    description:
      'A neuron’s membrane of lipids, the inside it separates from the outside, and the ions on both sides; how charges push and pull; then potassium: its channels, its diffusion out of the cell, and the electric field its leaving builds across the membrane.',
    flag: learnElectricalPhysicsFlag.key,
    slides: ELECTRICAL_PHYSICS_SLIDES,
    // slide 4's: ions bouncing off the membrane
    preview: 'physics2:barrier',
  },
  {
    id: 'validation',
    rough: true,
    title: 'Simulations and validation',
    level: 'Intermediate',
    description:
      'Large-scale biophysically detailed models of the brain, why to build them, and how to tell whether one is right: comparing its spikes with real recordings over trials, for single neurons, pairs and populations; the recording techniques behind the data, each with its caveats; and where models are heading.',
    flag: learnValidationFlag.key,
    slides: VALIDATION_SLIDES,
    // slide 10's: the same neuron over eight trials, in the data and the model
    preview: 'validation:trials',
  },
  {
    id: 'basic-electrical-physics',
    rough: true,
    title: 'Basic electrical physics',
    level: 'Beginner',
    description:
      'The electrical physics needed to model neuronal circuits, from the ground up, in five sections: basic terms and concepts — charge, the particles that carry it, atoms, molecules and ions, current, force, work, voltage, resistance, conductance, Ohm’s law, capacitance and power; electrical circuits, their parts, and components in parallel and in series; the RC circuit, Kirchhoff’s voltage law, charging a capacitor and the time constant; cable theory; and the electric field.',
    flag: learnBasicElectricalPhysicsFlag.key,
    slides: BASIC_ELECTRICAL_PHYSICS_SLIDES,
    preview: 'elec:intro',
  },
  {
    id: 'electrical-physics-first-take',
    rough: true,
    title: 'The electrical physics of a neuron (first take)',
    level: 'Beginner',
    description:
      'The electrical physics a single neuron’s dynamics rests on, close in on a piece of dendrite: charge and voltage, the membrane as a capacitor, current and conductance, diffusion and the equilibrium potential — where the voltage’s field lies, and why the crossings balance — the driving force and rest, the membrane as a circuit and its time constant, the dendrite as a cable and its length constant, voltage-gated channels and the spike — and the one equation behind all of it.',
    flag: learnElectricalPhysicsFirstTakeFlag.key,
    slides: ELECTRICAL_PHYSICS_FIRST_TAKE_SLIDES,
    preview: 'physics:zoom',
  },
  {
    id: 'neurotransmitters',
    rough: true,
    title: 'Neurotransmitters',
    level: 'Intermediate',
    description:
      'The neurotransmitters: how a synapse releases them and how their receptors act on the membrane’s voltage, fast and slow, exciting, inhibiting or modulating; then each in turn, with its electrical effect and what it is thought to do — glutamate, GABA, glycine, acetylcholine, the monoamines, adenosine, neuropeptides, endocannabinoids and nitric oxide; how the signal is cleared away; and how brain models describe a synapse.',
    flag: learnNeurotransmittersFlag.key,
    slides: NEUROTRANSMITTERS_SLIDES,
    preview: 'transmitters:intro',
  },
  {
    id: 'neuron-vs-jaxley',
    rough: true,
    title: 'NEURON and Jaxley',
    level: 'Intermediate',
    description:
      'Two simulators of detailed neurons, and how they differ: first what any such simulator does — compartments, coupled by the current between them, stepped implicitly, solved by the Hines algorithm — then NEURON, its NMODL channels, its circuits across processors and its gradient-free fitting; then Jaxley, the same models in JAX, giving the same voltages, with gradients, gradient descent and many simulations at once; side by side; and which the Open Brain Platform uses. Every piece of code shown was run, and what it printed is what is shown.',
    flag: learnNeuronJaxleyFlag.key,
    slides: NEURON_VS_JAXLEY_SLIDES,
    preview: 'jaxley:cell',
  },
  {
    id: 'cortical-cells',
    rough: true,
    title: 'The cells of the cortex',
    level: 'Intermediate',
    description:
      'The cortex’s kinds of neuron: the 26 of the rat’s somatosensory cortex, one real cell of each — their families, shapes and layers; the pyramidal cells layer by layer; the interneurons and the parts of the pyramidal cell each aims at; how they fire; their genes; and the microcircuit they make.',
    flag: learnCorticalCellsFlag.key,
    slides: CORTICAL_CELLS_SLIDES,
    preview: 'kinds',
  },
  {
    id: 'platform',
    rough: true,
    title: 'Introduction to the platform',
    level: 'Beginner',
    description:
      'The platform path: what the Open Brain Platform is for; virtual labs, projects and credits; its sections — Home, Data, an item’s page, Workflows, Notebooks — with what is public and what is private, how models build on each other, and a run from its form to its results; the OBI Assistant, and its tools over MCP; the services behind it; and a first session, end to end. ← goes back to the choice.',
    flag: learnPlatformFlag.key,
    slides: PLATFORM_SLIDES,
    preview: 'platform:what',
  },
  {
    id: 'entitysdk',
    rough: true,
    title: 'How to use entitysdk',
    level: 'Intermediate',
    description:
      'entitysdk, OBI’s Python client for EntityCore: connecting, searching and filtering, reading an entity’s fields, fetching one by id, downloading its files and working on them, models and recordings, registering your own — every cell as run against production, with what it printed.',
    flag: learnEntitysdkFlag.key,
    slides: ENTITYSDK_SLIDES,
    preview: 'sdk:entities',
  },
  {
    id: 'misc',
    rough: true,
    title: 'Miscellaneous',
    level: 'All levels',
    description:
      'Slides that used to end the brain-modeling path, kept together as a course of their own: synapses, the neuron and its inputs, the axon initial segment, and the membrane’s voltage — from separated charge up to the spike.',
    flag: learnMiscFlag.key,
    slides: MISC_SLIDES,
    preview: 'morphology',
  },
];

export function getLearnCourse(id: string) {
  return LEARN_COURSES.find((course) => course.id === id);
}

/** A course's thumbnail, on its card. */
export const learnCourseThumb = (id: string) => `/images/learn/${id}-thumb.webp`;

/** The Learn page of a project, which a course leads back to. */
export const learnPagePath = (root: string, virtualLabId: string, projectId: string) =>
  `${root}/${virtualLabId}/${projectId}/learn`;

/**
 * Where a course leads back to: the Learn page it was opened from, when `from` is one (perhaps
 * with its course chosen); otherwise the platform, which opens on the learner's last project.
 */
export function learnHome(root: string, from: unknown) {
  const escaped = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}/[\\w-]+/[\\w-]+/learn(\\?course=[\\w-]+)?$`);
  return typeof from === 'string' && pattern.test(from) ? from : root;
}

/** A course's own page, full screen: opened on a slide (1 for the first), leading back to `from`. */
export function learnCoursePath(id: string, from: string, slide?: number) {
  const query = new URLSearchParams({ from });
  if (slide && slide > 1) query.set('slide', String(slide));
  return `/app/learn/${id}?${query}`;
}
