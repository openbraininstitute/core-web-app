export const EntityTypeGroup = {
  Experimental: 'experimental',
  Simulations: 'simulations',
  Models: 'models',
  Notebooks: 'notebooks',
  Extractions: 'extractions',
} as const;

export type TEntityTypeGroup = (typeof EntityTypeGroup)[keyof typeof EntityTypeGroup];
