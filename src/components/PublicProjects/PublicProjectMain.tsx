'use client';

import type { Parser } from 'nuqs';
import { parseAsString, useQueryState } from 'nuqs';

import { tryType } from '../LandingPage/content';

import { ShowCaseProjectQueryType } from './type';

import HeaderPublicProject from './HeaderPublicProject';
import NavigationSections from './NavigationSections';
import singleCaseQuery from './api/fetchSingleCase';
import ArtifactsSection from './sections/Artifacts';
import DescriptionSection from './sections/Description';
import NotebookSection from './sections/Notebook';

import { useSanity } from '@/services/sanity';
import { Sections } from '@/types/public-projects';

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
  const content =
    useSanity<ShowCaseProjectQueryType>(singleCaseQuery(slug), isShowCaseProjectProps) ?? null;

  const [section, updateSection] = useQueryState(
    'description',
    parseAsString.withDefault('description') as Parser<Sections>
  );
  const handleTabChange = (tab: Sections) => updateSection(tab);

  let activeSectionContent;

  if (content !== null) {
    switch (section) {
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
          <NavigationSections section={section ?? 'description'} updateSection={handleTabChange} />
          <div className="scroll-behavior: smooth; flex min-h-[70vh] w-full flex-row gap-x-12 bg-white p-8 text-primary-9">
            {activeSectionContent}
          </div>
        </div>
      </div>
    )
  );
}
