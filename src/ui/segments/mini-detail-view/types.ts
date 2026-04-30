export const MiniDetailViewTheme = {
  Light: 'light',
  Default: 'default',
} as const;

export type TMiniDetailViewTheme = (typeof MiniDetailViewTheme)[keyof typeof MiniDetailViewTheme];
