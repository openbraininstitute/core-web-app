import type { Metadata } from 'next';

import SingleGlossaryContent from '@/components/documentation/glossary/single-glossary-content';

export const metadata: Metadata = {
  title: 'Glossary definitions',
  description: 'Explore the glossary definitions in our documentation.',
};

export default function Page() {
  return <SingleGlossaryContent />;
}
