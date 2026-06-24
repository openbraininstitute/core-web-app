const prefix = 'user';

export const keyBuilder = {
  profile: () => [`${prefix}/profile`],
  countries: () => [`${prefix}/countries`],
  subscription: () => [`${prefix}/subscription`],
  invoices: () => [`${prefix}/invoices`],
  invoicesPaginated: ({ page, pageSize }: { page: number; pageSize: number }) => [
    `${prefix}/invoices`,
    { page, pageSize },
  ],
  person: ({ userId }: { userId?: string }) => [`${prefix}/person`, { userId }],
  groups: () => [`${prefix}/groups`],
};
