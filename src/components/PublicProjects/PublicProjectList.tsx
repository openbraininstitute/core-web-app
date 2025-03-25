'use client';

import { tryType } from '../LandingPage/content';

import query from './api/query';
import SinglePublicProjectCard from './SinglePublicProjectCard';
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

export default function PublicProjectList() {
  const content = useSanity(query, isShowCaseProjectProps) ?? [];

  return (
    <div className="flex h-full w-full flex-grow flex-col gap-y-8">
      {content.map((showcase: ShowCaseProjectQueryType) => (
        <SinglePublicProjectCard key={showcase.slug} value={showcase} />
      ))}
    </div>
  );
}
