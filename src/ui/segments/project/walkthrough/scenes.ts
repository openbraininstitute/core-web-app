import type { TModel } from '@/ui/segments/project/models/models';

/** What the stage beside a chapter shows: one of the models, the course's figure, or an animation. */
export type TWalkthroughScene = TModel | 'course' | 'workflows' | 'notebooks';

/** The course figure on show beside "How neurons talk": a synapse letting charge into a dendrite. */
export const COURSE_WIDGET = 'synapse';
