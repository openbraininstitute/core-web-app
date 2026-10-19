const prefix = 'external';

export const keyBuilder = {
  stripeSetupIntent: ({ virtualLabId }: { virtualLabId: string }) => [
    `${prefix}-setup-intent`,
    { virtualLabId },
  ],
  stripeInstance: () => [`${prefix}-stripe-instance`],
  s3presignedUrl: (props: Record<string, unknown>) => [`${prefix}-presigned-url`, { ...props }],
  quickAccessList: () => [`${prefix}-quick-access-list`],
  discoverTutorialsList: () => [`${prefix}-discover-tutorial-list`],
  projectHomeGetStarted: () => [`${prefix}-project-home-get-started`],
  countries: () => [`${prefix}/countries`],
};
