import {
  EntityCoreTypeConfig,
  SerializedEntityCoreTypeConfig,
} from '@/entity-configuration/domain/types';

export const resolveDataKey = ({
  projectId,
  entity,
  section,
  suffix,
}: {
  section: 'explore' | 'build' | 'simulate' | 'bookmark' | 'activity' | (string & {});
  projectId?: string | undefined;
  entity?: SerializedEntityCoreTypeConfig<any> | EntityCoreTypeConfig<any> | undefined;
  suffix?: string;
}): string => {
  let dataKey = '';
  if (projectId) {
    dataKey = `${section}/${projectId}`;
  }
  if (entity) {
    dataKey = `${dataKey}/${entity.type}`;
  }
  if (!projectId && entity && section === 'explore') return `public-explore/${entity.type}`;
  if (!projectId && !entity && section === 'explore') return 'public-explore';
  if (suffix) {
    dataKey = `${dataKey}/${suffix}`;
  }
  return dataKey;
};

export const getSectionFromDataKey = (dataKey: string): string => {
  const [section] = dataKey.split('/');
  return section;
};
