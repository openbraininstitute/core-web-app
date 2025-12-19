import type { PortableTextBlock } from 'next-sanity';
import { PortableText } from 'next-sanity';
import { getAboutContent } from '@/api/sanity/help-about-section/route';
import styles from '@/ui/segments/help/about/about-content.module.css';
import { cn } from '@/utils/css-class';
import { getSearchParam } from '@/utils/getSearchParams';

export const dynamic = 'force-dynamic';

export type AboutContentProps = {
  aboutContent: PortableTextBlock[];
  termsAndConditionContent: PortableTextBlock[];
  aboutTheAppContent: PortableTextBlock[];
};

export default async function AboutContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const content = (await getAboutContent()) as AboutContentProps;

  const aboutParam = getSearchParam(searchParams, 'subsection') ?? 'about'; // Default to 'about'

  const contentFiltered = (): PortableTextBlock[] => {
    if (aboutParam === 'about') {
      return content.aboutContent;
    }
    if (aboutParam === 'terms-and-conditions') {
      return content.termsAndConditionContent;
    }
    if (aboutParam === 'about-the-app') {
      return content.aboutTheAppContent;
    }
    return content.aboutContent; // Fallback to about content
  };

  return (
    <div
      className={cn(
        'text-primary-9 col-span-3 flex max-h-[82vh] w-2/3 flex-col items-start gap-y-4 overflow-y-scroll',
        styles.content,
      )}
    >
      <PortableText value={contentFiltered()} />
    </div>
  );
}
