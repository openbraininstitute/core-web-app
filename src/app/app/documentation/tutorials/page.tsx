import { Metadata } from 'next';

import AllTutorialsContent from '@/components/documentation/tutorials/all-tutorials-content';

export const metadata: Metadata = {
  title: 'All Tutorials',
  description: 'Explore all available tutorials to enhance your skills and knowledge.',
};

export default function Page() {
  return <AllTutorialsContent />;
}
