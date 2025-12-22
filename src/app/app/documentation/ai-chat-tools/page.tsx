import { Metadata } from 'next';

import AllAIToolsContent from '@/components/documentation/ai-tools/all-tools';

export const metadata: Metadata = {
  title: 'AI Chat tools',
  description: 'Explore the AI chat tools available in our application.',
};

export default function Page() {
  return <AllAIToolsContent />;
}
