'use client';

import { useState } from 'react';

import { tryType } from '../LandingPage/content';

import { ShowCaseProjectQueryType } from './type';

import HeaderPublicProject from './HeaderPublicProject';
import NavigationSections from './NavigationSections';
import singleCaseQuery from './api/fetchSingleCase';
import ArtifactsSection from './sections/Artifacts';
import DescriptionSection from './sections/Description';
import NotebookSection from './sections/Notebook';

import { useSanity } from '@/services/sanity';

const isShowCaseProjectProps = (data: unknown): data is ShowCaseProjectQueryType => {
  return tryType('ShowCaseProjectProps', data, {
    name: 'string',
    slug: 'string',
    introduction: 'string',
    heroImage: 'string',
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
    videosList: [
      '|',
      'null',
      [
        'array',
        {
          url: 'string',
          title: ['|', 'null', 'string'],
          alt: 'string',
          hasCaption: 'boolean',
          caption: ['|', 'null', 'undefined', 'string'],
          useTimestamps: 'boolean',
          timestamps: [
            '|',
            'null',
            'undefined',
            [
              'array',
              {
                timestamp: 'number',
                label: 'string',
                description: 'string',
              },
            ],
          ],
          captionTrack: ['|', 'null', 'string'],
        },
      ],
    ],
    artifactType: 'string',
    artifact: [
      '|',
      'null',
      [
        'array',
        {
          title: 'string',
          description: 'string',
          file: ['|', 'null', 'string'],
          url: ['|', 'null', 'string'],
          _type: 'string',
        },
      ],
    ],
    meModelsList: [
      '|',
      'null',
      [
        'array',
        {
          name: 'string',
          morphology: 'string',
          trace: 'string',
          validated: 'boolean',
          brainRegion: 'string',
          mType: 'string',
          eType: 'string',
          url: 'string',
          _type: 'string',
        },
      ],
    ],
    eModelsList: [
      '|',
      'null',
      [
        'array',
        {
          name: 'string',
          response: 'string',
          brainRegion: 'string',
          mType: 'string',
          eType: 'string',
          modelCumulatedScore: 'number',
          _type: 'string',
        },
      ],
    ],
    notebook: [
      '|',
      'null',
      [
        'array',
        {
          name: 'string',
          readMe: 'unknown',
          url: 'string',
        },
      ],
    ],
    _updatedAt: 'string',
  });
};

export default function PublicProjectMain({ slug }: { slug: string }) {
  const content = useSanity(singleCaseQuery(slug), isShowCaseProjectProps) ?? null;

  const [activeSection, setActiveSection] = useState<string>('description');

  let activeSectionContent;

  switch (activeSection) {
    case 'description':
      activeSectionContent = content !== null && <DescriptionSection content={content} />;
      break;
    case 'artifacts':
      activeSectionContent = content !== null && <ArtifactsSection content={content} />;
      break;
    case 'notebooks':
      activeSectionContent = content !== null && <NotebookSection content={content} />;
      break;
    default:
      activeSectionContent = content !== null && <DescriptionSection content={content} />;
      break;
  }

  return (
    content !== null && (
      <div className="relative flex min-h-screen w-screen flex-col gap-y-12 bg-primary-9 py-6 pl-28 pr-10">
        <HeaderPublicProject title={content.name} headerImage={content?.heroImage} />

        <div className="flex flex-col">
          <NavigationSections activeSection={activeSection} setActiveSection={setActiveSection} />
          <div className="flex min-h-[70vh] w-full flex-row gap-x-12 bg-white p-8 text-primary-9">
            {activeSectionContent}
          </div>
        </div>
      </div>
    )
  );
}
