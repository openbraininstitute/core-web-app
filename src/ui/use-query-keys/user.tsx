const prefix = 'user';

export const keyBuilder = {
  profile: () => [`${prefix}/profile`],
  subscription: () => [`${prefix}/subscription`],
  invoices: () => [`${prefix}/invoices`],
  person: ({ userId }: { userId?: string }) => [`${prefix}/person`, { userId }],
  groups: () => [`${prefix}/groups`],
};
