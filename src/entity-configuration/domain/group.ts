export const EntityTypeGroup = {
  Experimental: 'experimental',
  Simulations: 'simulations',
  Models: 'models',
} as const;

export type TEntityTypeGroup = (typeof EntityTypeGroup)[keyof typeof EntityTypeGroup];
