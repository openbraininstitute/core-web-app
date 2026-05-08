const prefix = 'user';

export const keyBuilder = {
  profile: () => [`${prefix}/profile`],
  countries: () => [`${prefix}/countries`],
  subscription: () => [`${prefix}/subscription`],
  invoices: () => [`${prefix}/invoices`],
  person: ({ userId }: { userId?: string }) => [`${prefix}/person`, { userId }],
};
