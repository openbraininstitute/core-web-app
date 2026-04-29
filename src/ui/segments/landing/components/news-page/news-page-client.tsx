'use client';

import { PortableText } from 'next-sanity';

import Menu from '@/ui/segments/landing/layout/menu/menu';
import { EnumSection } from '@/ui/segments/landing/sections/sections';
import { classNames } from '@/util/utils';

import HeaderNews from './header-news';
import ButtonComponent from './portable-text/button-component';
import ImageFullScreen from './portable-text/image-full-screen';
import SimpleImage from './portable-text/simple-image';

import type { ContentForNewsItem } from '@/services/sanity/api/get-news-item';

import styles from './single-news-page.module.css';

type NewsPageProps = {
  className?: string;
  newsItem: ContentForNewsItem;
};

export type FullScreenImageValue = {
  image: string;
  caption?: string;
  altText: string;
  [key: string]: any;
};
export type ButtonBlockValue = {
  [key: string]: any;
  label: string;
  buttonType: 'file' | 'link';
  link: string;
  file: string;
  image: string;
};

const portableTextComponents = {
  types: {
    fullScreenImage: ({ value }: { value: FullScreenImageValue }) => (
      <ImageFullScreen value={value} />
    ),
    image: ({ value }: { value: FullScreenImageValue }) => <SimpleImage value={value} />,
    buttonComponent: ({ value }: { value: ButtonBlockValue }) => <ButtonComponent value={value} />,
  },
};

export default function NewsPageClient({ className, newsItem }: NewsPageProps) {
  return (
    <div className={classNames(className, styles.pageContent)}>
      <Menu scrollHasStarted section={EnumSection.News} />
      <HeaderNews content={newsItem} />
      <div className={styles.content}>
        <PortableText value={newsItem.articleContent} components={portableTextComponents} />
      </div>
    </div>
  );
}
