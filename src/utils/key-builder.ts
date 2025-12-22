import {
  EntityCoreTypeConfig,
  SerializedEntityCoreTypeConfig,
} from '@/entity-configuration/domain/types';

export const AppUInterfaceSection = {
  Data: 'data',
  Workflows: 'workflows',
  Bookmark: 'bookmark',
  Activity: 'activity',
  Notebooks: 'notebooks',
} as const;

export type TAppUInterfaceSection =
  | (typeof AppUInterfaceSection)[keyof typeof AppUInterfaceSection]
  | (string & {});

export const resolveDataKey = ({
  projectId,
  entity,
  section,
  suffix,
}: {
  section: TAppUInterfaceSection;
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
  if (!projectId && entity && section === AppUInterfaceSection.Data)
    return `public-data/${entity.type}`;
  if (!projectId && !entity && section === AppUInterfaceSection.Data) return 'public-data';
  if (suffix) {
    dataKey = `${dataKey}/${suffix}`;
  }
  return dataKey;
};

export const getSectionFromDataKey = (dataKey: string): string => {
  const [section] = dataKey.split('/');
  return section;
};
