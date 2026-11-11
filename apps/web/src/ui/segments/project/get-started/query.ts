import { defineQuery } from 'next-sanity';

import { config } from '@/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export const DEFAULT_GET_STARTED_VIDEO_SLUG = 'how-to-explore-data';
export const TutorialQuery = defineQuery(
  `*[_type == "tutorial"][]{
      _type,
      title, 
      "category": coalesce(
        category,
        category->title,
        category.title,
        categories[0],
        categories[0]->title,
        categories[0].title,
        tutorialCategory,
        tutorialCategory->title,
        tutorialCategory.title
      ),
      "posterImage": coalesce(posterImage.asset->url, thumbnail.asset->url),
      "slug": slug.current,
      "url": videoUrl
    }`
);

export type TTutorial = {
  category: string | null;
  posterImage: string | null;
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

export const ProjectHomeGetStartedQuery = defineQuery(
  `*[_type == "projectHome"][0]{
    "getStarted": getStarted[]{
      _key,
      title,
      description,
      label,
      link,
      thumbnailType,
      video,
      "image": image.asset->{"url": url, "width": metadata.dimensions.width, "height": metadata.dimensions.height},
      "resources": resources[]{
        _key,
        label,
        entityType,
        targetType,
        "stagingLink": coalesce(stagingEntityId, stagingLink),
        "productionLink": coalesce(productionEntityId, productionLink)
      }
    },
    "obiAssistant": obiAssistant[]{
      _key,
      title,
      question
    }
  }`
);

export const ProjectHomeResourceEntityTypeDict = {
  Data: 'data',
  Workflow: 'workflow',
  Notebook: 'notebook',
} as const;

export type TProjectHomeResourceEntityType =
  (typeof ProjectHomeResourceEntityTypeDict)[keyof typeof ProjectHomeResourceEntityTypeDict];

export type TProjectHomeResource = {
  _key: string;
  label: string;
  entityType: TProjectHomeResourceEntityType | null;
  targetType: string | null;
  stagingLink: string | null;
  productionLink: string | null;
};

export type TProjectHomeGetStartedCard = {
  _key: string;
  title: string;
  description: string;
  label: string;
  link: string;
  thumbnailType: 'video' | 'image';
  video?: string;
  image?: { url: string; width: number; height: number };
  resources: Array<TProjectHomeResource>;
};

export type TObiAssistantTopic = {
  _key: string;
  title: string;
  question: string;
};

export type TProjectHomeData = {
  getStarted: TProjectHomeGetStartedCard[] | null;
  obiAssistant: TObiAssistantTopic[] | null;
};
