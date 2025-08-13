import { Metadata } from 'next';

import SingleTutorialContent from '@/components/documentation/tutorials/single-tutorial-content';

export const metadata: Metadata = {
  title: 'Tutorial',
  description: 'Explore our tutorials to enhance your skills and knowledge.',
};

export default function Page() {
  return <SingleTutorialContent />;
}
