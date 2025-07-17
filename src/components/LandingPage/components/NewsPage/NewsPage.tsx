'use client';

import { PortableText } from 'next-sanity';

import LandingPage from '../../LandingPage';
import { useSanityContentForNewsItem } from '../../content';
import FooterPanel from '../../layout/FooterPanel';
import { EnumSection } from '../../sections/sections';

import Menu from '../../layout/Menu';
import HeaderNews from './HeaderNews';
import ButtonComponent from './portable-text/button-component';
import ImageFullScreen from './portable-text/image-full-screen';
import SimpleImage from './portable-text/simple-image';

import { classNames } from '@/util/utils';

import styles from '@/components/LandingPage/components/NewsPage/single-news-page.module.css';

type NewsPageProps = {
  className?: string;
  slug: string;
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

export default function NewsPage({ className, slug }: NewsPageProps) {
  const news = useSanityContentForNewsItem(slug);

  if (!news) {
    return <LandingPage section={EnumSection.News} />;
  }

  return (
    <div className={classNames(className, styles.pageContent)}>
      <Menu scrollHasStarted section={EnumSection.News} />
      <HeaderNews content={news} />
      <div className={styles.content}>
        <PortableText value={news.articleContent} components={portableTextComponents} />
      </div>
      <FooterPanel />
    </div>
  );
}
