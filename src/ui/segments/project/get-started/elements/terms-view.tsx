'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import SanityContentRTF from '@/components/LandingPage/components/SanityContentRTF';
import { useSanityContentRTF } from '@/components/LandingPage/content/content';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import Slugify from '@/util/slugify';
import { cn } from '@/utils/css-class';

import type { ContentForRichText } from '@/components/LandingPage/content/types';

import styles from '@/ui/segments/help/about/about-content.module.css';

type TermsSection = { title: string; slug: string; content: ContentForRichText };

function splitIntoSections(content: ContentForRichText): TermsSection[] {
  const sections: TermsSection[] = [];
  let current: TermsSection | null = null;

  for (const block of content) {
    const isH2Heading = block._type === 'titleHeadline' && block.levelType === 'h2';
    if (isH2Heading) {
      const title = (block as { title: string }).title;
      current = { title, slug: Slugify(title), content: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { title: 'Overview', slug: 'overview', content: [] };
      sections.push(current);
    }
    current.content.push(block);
  }

  return sections;
}

export function TermsView() {
  const content = useSanityContentRTF(EnumSection.TermsAndConditions);
  const sections = splitIntoSections(content);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSlug = searchParams.get('section');
  const active = sections.find((s) => s.slug === currentSlug) ?? sections[0];

  if (!sections.length) {
    return (
      <div className="border-neutral-2 bg-background flex w-full rounded-2xl border p-4">
        <p className="text-primary-9/70">No content available.</p>
      </div>
    );
  }

  return (
    <div className="border-neutral-2 bg-background mb-32 flex h-full max-h-[calc(100vh-18rem)] w-full overflow-hidden rounded-2xl border p-4">
      <div className="border-neutral-2 w-1/4 shrink-0 overflow-y-auto border-r pr-4">
        <div className="flex w-full flex-col gap-y-6">
          <div className="flex flex-col gap-y-2">
            <h3 className="text-primary-9 text-sm font-bold tracking-wide uppercase">Sections</h3>
            <div className="flex flex-col gap-y-1.5">
              {sections.map((section) => {
                const isActive = active?.slug === section.slug;
                return (
                  <button
                    type="button"
                    aria-label={`View terms section ${section.title}`}
                    key={section.slug}
                    onClick={() => {
                      const url = new URL(window.location.href);
                      url.searchParams.set('section', section.slug);
                      router.replace(`${url.pathname}${url.search}`, { scroll: false });
                    }}
                    className={cn(
                      'text-primary-9 flex w-full items-center justify-between text-left text-base',
                      isActive && 'font-bold'
                    )}
                  >
                    {section.title}
                    {isActive && <span className="bg-primary-9 h-2 w-2 rounded-full" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className={cn('text-primary-9 w-3/4 overflow-y-auto pl-4', styles.content)}>
        {active && (
          <div className="flex flex-col items-start gap-y-4">
            <h2 className="text-primary-9 text-2xl font-bold">{active.title}</h2>
            <SanityContentRTF value={active.content} />
          </div>
        )}
      </div>
    </div>
  );
}

export default TermsView;
