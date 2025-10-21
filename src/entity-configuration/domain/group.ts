export const EntityTypeGroup = {
  Experimental: 'experimental',
  Simulations: 'simulations',
  Models: 'models',
  Notebooks: 'notebooks',
} as const;

export type TEntityTypeGroup = (typeof EntityTypeGroup)[keyof typeof EntityTypeGroup];
