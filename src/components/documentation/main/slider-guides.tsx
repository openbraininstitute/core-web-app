'use client';

import Link from 'next/link';
import ComingSoonPill from '../global/coming-soon-pill';
import { SingleGuideProps } from '../type';
import SingleGuideCard from './single-guide-card';

const GUIDE_PLACEHOLDER: SingleGuideProps[] = [
  {
    title: 'Import morphologies',
    slug: 'import-morphologies',
    description:
      'Discover how to browse experimental data, model data or our many experiment simlations',
    objectOfInterest: 'Morphologies',
    scale: 'subcellular',
    content: null,
  },
  {
    title: 'Build e-model',
    slug: 'build-e-model',
    description: 'Discover how to build an e-model using our platform',
    objectOfInterest: 'E-model',
    scale: 'single-cell',
    content: null,
  },
  {
    title: 'Upload custom analysis',
    slug: 'upload-custom-analysis',
    description: 'Discover how to upload and manage your custom analysis on our platform',
    objectOfInterest: 'Custom Analysis',
    scale: 'all',
    content: null,
  },
];

export default function SliderGuidel() {
  return (
    <div className="pointer-events-none w-full opacity-30">
      <div className="mb-3 flex w-full flex-row items-center justify-between">
        <div className="flex flex-row gap-x-2">
          <h1 className="text-lg font-bold text-white">Our latest step-by-step guide</h1>
          <ComingSoonPill />
        </div>
        <Link
          href="/documentation/tutorials"
          className="text-sm font-semibold text-white hover:underline"
        >
          See all of our guides
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-x-4">
        {GUIDE_PLACEHOLDER.map((guide: SingleGuideProps) => (
          <SingleGuideCard key={guide.title} content={guide} />
        ))}
      </div>
    </div>
  );
}
