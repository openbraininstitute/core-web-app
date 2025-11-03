const prefix = 'external';

export const keyBuilder = {
  stripeSetupIntent: ({ virtualLabId }: { virtualLabId: string }) => [
    `${prefix}-setup-intent`,
    { virtualLabId },
  ],
  stripeInstance: () => [`${prefix}-stripe-instance`],
  s3presignedUrl: (props: Record<string, any>) => [`${prefix}-presigned-url`, { ...props }],
};
