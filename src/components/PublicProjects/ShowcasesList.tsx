'use client';

import { tryType } from '../LandingPage/content';

import query from './api/query';
import SingleShowCaseCard from './SingleShowCaseCard';
import { ShowCaseProjectQueryType } from './type';

import { useSanity } from '@/services/sanity';

const isShowCaseProjectProps = (data: unknown): data is ShowCaseProjectQueryType[] => {
  return tryType('ShowCaseProjectProps', data, [
    'array',
    {
      name: 'string',
      slug: 'string',
      introduction: 'string',
      authorsList: [
        'array',
        {
          firstName: 'string',
          lastName: 'string',
          email: 'string',
          institution: 'string',
        },
      ],
      description: 'unknown',
      _updatedAt: 'string',
      heroImage: 'string',
    },
  ]);
};

export default function ShowcasesList() {
  const content = useSanity(query, isShowCaseProjectProps) ?? [];

  return (
    <div className="flex h-full w-1/2 flex-grow flex-col gap-y-8 pl-96">
      {content.map((showcase: ShowCaseProjectQueryType) => (
        <SingleShowCaseCard key={showcase.slug} value={showcase} />
      ))}
    </div>
  );
}
