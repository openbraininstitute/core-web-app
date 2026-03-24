import { defineQuery } from 'next-sanity';

import { config } from '@/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export const DEFAULT_GET_STARTED_VIDEO_SLUG = 'how-to-explore-data';
export const DiscoverQuery = defineQuery(
  `*[_type == "tutorial"][]{
      _type,
      title, 
      "poster": thumbnail.asset->url,
      "slug": slug.current,
      "url": videoUrl
    }`
);

export type TTutorial = {
  poster: string;
  slug: string;
  title: string;
  url: string;
};

export const getQuickAccessQuery = () => {
  const env = config.DEPLOYMENT_ENV;
  let _type = 'quickaccess';
  if (env === 'production') _type = 'quickaccessproduction';

  return defineQuery(
    `*[_type == "${_type}"][]{
      group,
      title,
      "list": list[]{
        description,
        entityId,
        isPreview,
        extendedType,
        title,
        "thumbnail": select(
          assetInfoType == "file" => assetFile.asset->url,
          assetInfoType == "url" => assetFile.asset,
          null
        ),

        "assetLabel": select(
          assetInfoType == "label" => assetLabel,
          null
        )
      }
    }`
  );
};

export const QuickAccessGroupDict = {
  Data: 'data',
  Notebooks: 'notebooks',
  Workflows: 'workflows',
} as const;
export type TQuickAccessGroup = (typeof QuickAccessGroupDict)[keyof typeof QuickAccessGroupDict];

export type TQuickAccessItem = {
  description: string;
  entityId: string;
  isPreview: boolean;
  title: string;
  thumbnail: string | null;
  assetLabel: string | null;
  extendedType: TExtendedEntitiesTypeDict;
};

export interface IQuickAccessList {
  group: TQuickAccessGroup;
  title: string;
  list?: Array<TQuickAccessItem>;
}
