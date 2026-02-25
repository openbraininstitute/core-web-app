import { defineQuery } from 'next-sanity';

export const discoverQuery = defineQuery(
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

export type TDiscoverTutorials = {
  tutorialOrder: TTutorial[];
};
