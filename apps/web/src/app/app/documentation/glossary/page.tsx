import GlossaryFullContent from '@/components/documentation/glossary/glossary-full-content';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Open Brain Platform Glossary',
  description: 'Explore the glossary definitions in our documentation.',
};

export default function Page() {
  return <GlossaryFullContent />;
}
