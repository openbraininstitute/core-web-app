const prefix = 'user';

export const keyBuilder = {
  profile: () => [`${prefix}/profile`],
  subscription: () => [`${prefix}/subscription`],
  invoices: () => [`${prefix}/invoices`],
};
