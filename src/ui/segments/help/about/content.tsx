import { useSearchParams } from 'next/navigation';

import { PortableText } from 'next-sanity';

import { PortableTextBlock } from '@sanity/types';

import { useSanityContentForAboutContent } from '@/components/documentation/hooks/use-sanity-content-for-about-section';
import { cn } from '@/utils/css-class';

import styles from './about-content.module.css';

export type AboutContentProps = {
  aboutContent: PortableTextBlock[];
  termsAndConditionContent: PortableTextBlock[];
  aboutTheAppContent: PortableTextBlock[];
};

export default function AboutContent() {
  const searchParams = useSearchParams();
  const aboutParam = searchParams.get('about');

  const content: AboutContentProps = useSanityContentForAboutContent();

  const contentFiltered = () => {
    if (aboutParam === 'about') {
      return content.aboutContent;
    }
    if (aboutParam === 'terms-and-conditions') {
      return content.termsAndConditionContent;
    }
    if (aboutParam === 'about-the-app') {
      return content.aboutTheAppContent;
    }
    return [];
  };

  return (
    <div
      className={cn(
        'text-primary-9 col-span-3 flex max-h-[82vh] w-2/3 flex-col items-start gap-y-4 overflow-y-scroll',
        styles.content
      )}
    >
      <PortableText value={contentFiltered()} />
    </div>
  );
}
