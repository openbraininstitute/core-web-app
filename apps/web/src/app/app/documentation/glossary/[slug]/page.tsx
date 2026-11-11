import SingleGlossaryContent from '@/components/documentation/glossary/single-glossary-content';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Glossary definitions',
  description: 'Explore the glossary definitions in our documentation.',
};

export default function Page() {
  return <SingleGlossaryContent />;
}
