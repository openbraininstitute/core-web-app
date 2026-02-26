import { defineQuery } from 'next-sanity';

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

export type TQuickAccessItem = {
  description: string;
  entityId: string;
  isPreview: boolean;
  title: string;
  thumbnail: string | null;
  assetLabel: string | null;
};

export interface IQuickAccessList {
  group: string;
  title: string;
  list: Array<TQuickAccessItem>;
}
