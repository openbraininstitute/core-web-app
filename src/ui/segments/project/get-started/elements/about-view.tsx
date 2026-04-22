'use client';

import { RightOutlined } from '@ant-design/icons';
import { PortableText, type PortableTextBlock } from 'next-sanity';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { AboutContentProps } from '@/services/sanity/api/get-about-content';

import styles from '@/ui/segments/help/about/about-content.module.css';

type Subsection = 'about' | 'terms-and-conditions';

const NAV_ITEMS: Array<{ id: Subsection; name: string }> = [
  { id: 'about', name: 'About' },
  { id: 'terms-and-conditions', name: 'Terms and condition' },
];

export function AboutView({ content }: { content: AboutContentProps }) {
  const [active, setActive] = useState<Subsection>('about');

  const blocks = (
    active === 'about' ? content.aboutContent : content.termsAndConditionContent
  ) as PortableTextBlock[];

  return (
    <div className="grid h-full w-full grid-cols-4 gap-x-6">
      <div className="col-span-1 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-auto">
        {NAV_ITEMS.map((section) => {
          const isActive = active === section.id;
          return (
            <Button
              rounded
              borderless
              key={`home-about-${section.id}`}
              variant="outline"
              onClick={() => setActive(section.id)}
              className={cn(
                'shadow-base h-15 w-full justify-start px-6 text-lg font-semibold',
                isActive ? 'bg-primary-9 text-white' : ''
              )}
              aria-label={`View ${section.name} section`}
            >
              {section.name}
              <RightOutlined className="ml-auto text-current" />
            </Button>
          );
        })}
      </div>
      <div
        className={cn(
          'text-primary-9 col-span-3 flex max-h-[82vh] flex-col items-start gap-y-4 overflow-y-auto pr-2',
          styles.content
        )}
      >
        {blocks?.length ? (
          <PortableText value={blocks} />
        ) : (
          <p className="text-primary-9/70">No content available.</p>
        )}
      </div>
    </div>
  );
}

export default AboutView;
