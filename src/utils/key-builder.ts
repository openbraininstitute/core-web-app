import {
  EntityCoreTypeConfig,
  SerializedEntityCoreTypeConfig,
} from '@/entity-configuration/domain/types';

export const resolveDataKey = ({
  projectId,
  entity,
  section,
}: {
  section: 'explore' | 'build' | 'experiment' | 'public-explore';
  projectId?: string | undefined;
  entity?: SerializedEntityCoreTypeConfig<any> | EntityCoreTypeConfig<any> | undefined;
}): string => {
  let dataKey = '';
  if (projectId) {
    dataKey = `${section}/${projectId}`;
  }
  if (entity) {
    dataKey = `${dataKey}/${entity.type}`;
  }
  if (!projectId && entity && section === 'explore') return `public-explore/${entity.type}`;
  else if (!projectId && !entity && section === 'explore') return 'public-explore';
  return dataKey;
};

export const getSectionFromDataKey = (dataKey: string): string => {
  const [section] = dataKey.split('/');
  return section;
};
