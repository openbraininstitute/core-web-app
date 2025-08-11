import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

const ADJECTIVES = [
  'cognitive',
  'synaptic',
  'neuroplastic',
  'dynamic',
  'focused',
  'curious',
  'vivid',
  'insightful',
  'quantum',
  'plastic',
  'neuronal',
  'robust',
];
const NOUNS = [
  'cajal',
  'brodmann',
  'raman',
  'hodgkin',
  'mountcastle',
  'ekstrom',
  'hubel',
  'weisel',
  'ramon',
  'descartes',
  'torvalds',
  'tesla',
];

export function randomProjectName() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const id = nanoid(); // generates 6 char random string

  return `${adjective}-${noun}-${id}`;
}
