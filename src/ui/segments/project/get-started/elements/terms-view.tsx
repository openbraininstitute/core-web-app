'use client';

import SanityContentRTF from '@/components/LandingPage/components/SanityContentRTF';
import { useSanityContentRTF } from '@/components/LandingPage/content/content';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import { cn } from '@/utils/css-class';

import styles from '@/ui/segments/help/about/about-content.module.css';

export function TermsView() {
  const content = useSanityContentRTF(EnumSection.TermsAndConditions);

  return (
    <div
      className={cn(
        'text-primary-9 border-neutral-2 flex max-h-[82vh] w-full flex-col items-start gap-y-4 overflow-y-auto rounded-2xl border bg-transparent p-4',
        styles.content
      )}
    >
      <h2 className="text-primary-9 text-2xl font-bold">Terms & Conditions</h2>
      {content?.length ? (
        <SanityContentRTF value={content} />
      ) : (
        <p className="text-primary-9/70">No content available.</p>
      )}
    </div>
  );
}

export default TermsView;
