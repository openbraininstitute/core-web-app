/**
 * Topics to narrow the Lectures to, matched against each talk's title and abstract: World Wide
 * Neuro's listings carry no topics of their own.
 */
export const LECTURE_TOPICS = [
  {
    id: 'dynamics',
    label: 'Network dynamics',
    match: /network|dynamic|attractor|chao|mean-field/i,
  },
  {
    id: 'learning',
    label: 'Learning & plasticity',
    match: /learn|plasticity|reinforcement|reward/i,
  },
  { id: 'memory', label: 'Memory', match: /memory|hippocamp|replay/i },
  {
    id: 'coding',
    label: 'Neural coding',
    match: /coding|code|representation|information|geometry/i,
  },
  { id: 'vision', label: 'Vision', match: /visual|vision|retina/i },
  { id: 'decision', label: 'Decisions & behaviour', match: /decision|behavio|choice|cogniti/i },
  {
    id: 'dendrites',
    label: 'Dendrites & cells',
    match: /dendrit|neuron model|single neuron|channel/i,
  },
  { id: 'oscillations', label: 'Oscillations', match: /oscillat|rhythm|synchron/i },
  {
    id: 'ai',
    label: 'Machine learning & AI',
    match: /deep|artificial|machine learning|transformer|\bAI\b|recurrent neural/i,
  },
  { id: 'motor', label: 'Movement', match: /motor|movement|locomot/i },
] as const;
export type LectureTopic = (typeof LECTURE_TOPICS)[number]['id'];
