'use client';

import { useSearchParams } from 'next/navigation';

import SanityContentRTF from '@/components/LandingPage/components/SanityContentRTF';
import { useSanityContentRTF } from '@/components/LandingPage/content/content';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import Slugify from '@/util/slugify';
import { cn } from '@/utils/css-class';

import type { ContentForRichText } from '@/components/LandingPage/content/types';

import styles from '@/ui/segments/help/about/about-content.module.css';

type TermsSection = { title: string; slug: string; content: ContentForRichText };
type TermsCard = { title: string | null; content: ContentForRichText };

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

function splitIntoCards(content: ContentForRichText): TermsCard[] {
  const cards: TermsCard[] = [];
  let current: TermsCard | null = null;

  for (const block of content) {
    if (block._type === 'verticalDivider') continue;
    const isH3 = block._type === 'titleHeadline' && block.levelType === 'h3';
    if (isH3) {
      current = { title: (block as { title: string }).title, content: [] };
      cards.push(current);
      continue;
    }
    if (!current) {
      current = { title: null, content: [] };
      cards.push(current);
    }
    current.content.push(block);
  }

  return cards.filter((c) => c.title || c.content.length > 0);
}

function TermsNavList({
  sections,
  currentSlug,
  onNavClick,
}: {
  sections: TermsSection[];
  currentSlug: string | null;
  onNavClick: (slug: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-y-6">
      <div className="flex flex-col gap-y-2">
        <h3 className="text-primary-9 text-sm font-bold tracking-wide uppercase">Sections</h3>
        <div className="flex flex-col gap-y-1.5">
          {sections.map((section) => {
            const isActive = currentSlug === section.slug;
            return (
              <button
                type="button"
                aria-label={`View terms section ${section.title}`}
                key={section.slug}
                onClick={() => onNavClick(section.slug)}
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
  );
}

function TermsContentList({ sections }: { sections: TermsSection[] }) {
  return (
    <div className="flex flex-col items-start gap-y-8">
      {sections.map((section) => (
        <section
          id={`terms-section-${section.slug}`}
          key={section.slug}
          className="flex w-full scroll-mt-4 flex-col items-start gap-y-4"
        >
          <h2 className="text-primary-9 text-2xl font-bold">{section.title}</h2>
          <div className="flex w-full flex-col gap-4">
            {splitIntoCards(section.content).map((card, index) => (
              <div
                key={card.title ?? `card-${index}`}
                className="border-neutral-2 text-primary-9 flex w-full flex-col rounded-xl border border-solid bg-white p-6"
              >
                {card.title && (
                  <h3 className="text-primary-9 mb-2 text-2xl font-bold">{card.title}</h3>
                )}
                <SanityContentRTF value={card.content} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function TermsView({ slot }: { slot?: 'nav' | 'content' } = {}) {
  const content = useSanityContentRTF(EnumSection.TermsAndConditions);
  const sections = splitIntoSections(content);
  const searchParams = useSearchParams();
  const currentSlug = searchParams.get('section');

  if (!sections.length) {
    return (
      <div className="border-neutral-2 bg-background flex w-full rounded-2xl border p-4">
        <p className="text-primary-9/70">No content available.</p>
      </div>
    );
  }

  const handleNavClick = (slug: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('section', slug);
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    document
      .getElementById(`terms-section-${slug}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (slot === 'nav') {
    return (
      <div className="border-neutral-2 bg-background w-full overflow-y-auto rounded-2xl border p-4">
        <TermsNavList sections={sections} currentSlug={currentSlug} onNavClick={handleNavClick} />
      </div>
    );
  }

  if (slot === 'content') {
    return (
      <div
        className={cn(
          'text-primary-9 mb-32 h-full max-h-[calc(100vh-18rem)] w-full overflow-y-auto p-4',
          '[&_ul.sanityContentItems>li]:!list-none',
          styles.content
        )}
      >
        <TermsContentList sections={sections} />
      </div>
    );
  }

  return (
    <div className="border-neutral-2 bg-background mb-32 flex h-full max-h-[calc(100vh-18rem)] w-full overflow-hidden rounded-2xl border p-4">
      <div className="border-neutral-2 w-1/4 shrink-0 overflow-y-auto border-r pr-4">
        <TermsNavList sections={sections} currentSlug={currentSlug} onNavClick={handleNavClick} />
      </div>
      <div
        className={cn(
          'text-primary-9 w-3/4 overflow-y-auto pl-4',
          '[&_ul.sanityContentItems>li]:!list-none',
          styles.content
        )}
      >
        <TermsContentList sections={sections} />
      </div>
    </div>
  );
}

export default TermsView;
