/**
 * The courses with a figure of their own, and each one's steps: a slide names
 * its figure `<course>:<step>` — `python:loops` — and the one figure for that
 * course carries on from slide to slide.
 */

import { ELEC_STEPS } from './elec/Figure';
import { JAXLEY_STEPS } from './jaxley/Figure';
import { PHYSICS_STEPS } from './physics/Figure';
import { PHYSICS2_STEPS } from './physics2/Figure';
import { PLATFORM_STEPS } from './platform/Figure';
import { PYTHON_STEPS } from './python/Figure';
import { SDK_STEPS } from './sdk/Figure';
import { TRANSMITTER_STEPS } from './transmitters/Figure';
import { VALIDATION_STEPS } from './validation/Figure';

const COURSE_STEPS = {
  python: PYTHON_STEPS,
  sdk: SDK_STEPS,
  physics: PHYSICS_STEPS,
  physics2: PHYSICS2_STEPS,
  jaxley: JAXLEY_STEPS,
  platform: PLATFORM_STEPS,
  elec: ELEC_STEPS,
  transmitters: TRANSMITTER_STEPS,
  validation: VALIDATION_STEPS,
} as const;

type CourseId = keyof typeof COURSE_STEPS;
/** A slide's course figure: its course, and its step there. */
export type CourseWidget = {
  [K in CourseId]: `${K}:${(typeof COURSE_STEPS)[K][number]}`;
}[CourseId];

export const isCourseWidget = (w: unknown): w is CourseWidget => {
  if (typeof w !== 'string') return false;
  const [course, step] = w.split(':');
  const steps = (COURSE_STEPS as Record<string, readonly string[]>)[course];
  return !!steps && steps.includes(step);
};
