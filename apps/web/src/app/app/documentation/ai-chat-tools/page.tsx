import AllAIToolsContent from '@/components/documentation/ai-tools/all-tools';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Chat tools',
  description: 'Explore the AI chat tools available in our application.',
};

export default function Page() {
  return <AllAIToolsContent />;
}
