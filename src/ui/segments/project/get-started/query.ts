import { defineQuery } from 'next-sanity';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export const DiscoverQuery = defineQuery(
  `*[_type=="documentationSettings"][0]{
        tutorialOrder[] -> {
            title,
            description,
            "slug": slug.current,
            "url": videoUrl,
            "imageURL": thumbnail.asset->url,
            "imageWidth": thumbnail.asset->metadata.dimensions.width,
            "imageHeight": thumbnail.asset->metadata.dimensions.height
        }
    }`
);

export type TTutorial = {
  description: string | null;
  imageHeight: number;
  imageWidth: number;
  imageURL: string;
  slug: string;
  title: string;
  url: string;
};

export interface IDiscoverTutorialsList {
  tutorialOrder: TTutorial[];
}

export const QuickAccessQuery = defineQuery(
  `*[_type == "quickaccess"][]{
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

export const QuickAccessGroupDict = {
  Data: 'data',
  Workflows: 'workflows',
  Notebooks: 'notebooks',
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
  list: Array<TQuickAccessItem>;
}
