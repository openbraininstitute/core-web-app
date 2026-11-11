import { HelpLayout } from '@/ui/layouts/help-layout';
import { HelpHeader } from '@/ui/segments/help/header';
import TutorialSection from '@/ui/segments/help/tutorials';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Tutorials',
  description: 'Explore all available tutorials to enhance your skills and knowledge.',
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <HelpLayout>
      <HelpHeader />
      <TutorialSection />
    </HelpLayout>
  );
}
