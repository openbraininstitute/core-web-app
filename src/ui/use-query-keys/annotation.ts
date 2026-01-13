const prefix = 'annotation';

export const keyBuilderAnnotation = {
  annotation: ({ id, type }: { id: string; type: 'eType' | 'mType' }) => [
    `${prefix}/one`,
    { id, type },
  ],
  annotations: ({
    type,
    ...props
  }: {
    type: 'eType' | 'mType';
  } & Record<string, any>) => [`${prefix}/all`, { type, ...props }],
};
