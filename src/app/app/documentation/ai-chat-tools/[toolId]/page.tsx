import type { Metadata } from 'next';

import SingleAIToolsContent from '@/components/documentation/ai-tools/single-tool';

export const metadata: Metadata = {
  title: 'Single AI Chat Tool',
  description: 'Explore the AI chat tools available in our application.',
};

export default function Page() {
  return <SingleAIToolsContent />;
}
