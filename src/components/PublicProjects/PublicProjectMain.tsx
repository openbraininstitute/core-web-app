'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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
    artifactType: ['|', 'null', ['array', 'string']],
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
          file: 'string',
          name: 'string',
          brainRegion: 'string',
          validated: 'boolean',
          mType: 'string',
          eType: 'string',
          hasMorphologyThumbnail: 'boolean',
          morphologyId: 'string',
          morphology: ['|', 'null', 'string'],
          traceFileId: 'string',
          hasTraceThumbnail: 'boolean',
          trace: ['|', 'null', 'string'],
          url: ['|', 'null', 'string'],
          _type: 'string',
        },
      ],
    ],
    minimalMeModel: [
      '|',
      'null',
      [
        'array',
        {
          name: 'string',
          brainRegion: 'string',
          mTtype: ['|', 'undefined', 'string'],
          eType: 'string',
          species: 'string',
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
          hasResponseThumbnail: 'boolean',
          response: ['|', 'null', 'string'],
          brainRegion: 'string',
          mType: ['|', 'null', 'string'],
          eType: 'string',
          hasMorphologyThumbnail: 'boolean',
          // morphology: 'string',
          modelCumulatedScore: 'number',
          species: 'string',
          contributor: ['|', 'null', 'string'],
          creationDate: 'string',
        },
      ],
    ],
    notebook: [
      '|',
      'null',
      [
        'array',
        {
          name: ['|', 'null', 'string'],
          readMe: 'unknown',
          url: ['|', 'null', 'string'],
        },
      ],
    ],
    _updatedAt: 'string',
  });
};

export default function PublicProjectMain({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('section') ?? 'description';
  const [activeSection, setActiveSection] = useState<string>(initialTab);

  const content =
    useSanity<ShowCaseProjectQueryType>(singleCaseQuery(slug), isShowCaseProjectProps) ?? null;

  useEffect(() => {
    const section = searchParams.get('section') ?? 'description';
    const validSections = ['description', 'notebook', 'artifacts'];

    const newSection = validSections.includes(section) ? section : 'description';
    setActiveSection(newSection);
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    const validSections = ['description', 'notebook', 'artifacts'];
    if (!validSections.includes(tab)) return;

    setActiveSection(tab);

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('section', tab);
    window.history.pushState({}, '', newUrl);
  };

  let activeSectionContent;

  if (content !== null) {
    switch (activeSection) {
      case 'description':
        activeSectionContent = <DescriptionSection content={content} />;
        break;
      case 'artifacts':
        activeSectionContent = <ArtifactsSection content={content} />;
        break;
      case 'notebooks':
        activeSectionContent = <NotebookSection content={content} />;
        break;
      default:
        activeSectionContent = <DescriptionSection content={content} />;
        break;
    }
  }

  return (
    content !== null && (
      <div className="relative flex min-h-screen w-full flex-col gap-y-12 bg-primary-9 py-6 pl-28 pr-10">
        <HeaderPublicProject title={content.name} headerImage={content.heroImage} />

        <div className="flex flex-col">
          <NavigationSections activeSection={activeSection} setActiveSection={handleTabChange} />
          <div className="scroll-behavior: smooth; flex min-h-[70vh] w-full flex-row gap-x-12 bg-white p-8 text-primary-9">
            {activeSectionContent}
          </div>
        </div>
      </div>
    )
  );
}
