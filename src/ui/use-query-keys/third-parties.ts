const prefix = 'external';

export const keyBuilder = {
  stripeSetupIntent: ({ virtualLabId }: { virtualLabId: string }) => [
    `${prefix}-setup-intent`,
    { virtualLabId },
  ],
  stripeInstance: () => [`${prefix}-stripe-instance`],
  obioneOpenapi: () => [`${prefix}-obione-open-api`],
  obioneOpenapiSchema: ({ form }: { form: string }) => [`${prefix}-obione-open-api`, { form }],
  s3presignedUrl: (props: Record<string, any>) => [`${prefix}-presigned-url`, { ...props }],
  quickAccessList: () => [`${prefix}-quick-access-list`],
  discoverTutorialsList: () => [`${prefix}-discover-tutorial-list`],
};
