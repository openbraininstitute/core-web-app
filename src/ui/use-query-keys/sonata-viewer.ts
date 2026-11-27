const prefix = 'sonata-viewer';
export const keyBuilderSonataViewer = {
  sectionPaths: ({
    virtualLabId,
    projectId,
    path,
  }: {
    virtualLabId: string;
    projectId: string;
    path: string;
  }) => [`${prefix}/section-paths`, { virtualLabId, projectId, path }],
};
