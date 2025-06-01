'use client';

import { useState } from 'react';
import SingleArtifact from '../SingleArtifact';
import { LinkAndDownloadArtifactProps, ShowCaseProjectQueryType } from '../type';
import ArtifactsTabNav from './artifact/artifacts-tab-nav';

export const typePlaceholder = [
  { id: 'eModel', name: 'E-Model' },
  { id: 'meModel', name: 'ME-Model' },
  { id: 'synaptome', name: 'Synaptome' },
  { id: 'downloadItem', name: 'Download Item' },
  { id: 'linkItem', name: 'Link Item' },
];

export function LinkAndDownloadArtifactList({
  content,
}: {
  content: LinkAndDownloadArtifactProps[];
}) {
  return (
    <div className="flex w-full flex-col gap-12">
      {content.map((singleArtifact: LinkAndDownloadArtifactProps, index: number) => (
        <SingleArtifact
          key={`Artifact_${singleArtifact.title}_${index + 1}`}
          content={singleArtifact}
        />
      ))}
    </div>
  );
}

export default function ArtifactsSection({ content }: { content: ShowCaseProjectQueryType }) {
  const [activeArtifactType, setActiveArtifactType] = useState<string | null>(
    typePlaceholder[0].id
  );

  const totalDataCount =
    (content?.artifact?.length ?? 0) +
    (content?.meModelsList?.length ?? 0) +
    (content?.minimalMeModel?.length ?? 0) +
    (content?.eModelsList?.length ?? 0);

  return (
    <div className="relative flex w-full flex-col gap-y-12 scroll-smooth" id="artifacts">
      <header className="sticky top-0 z-50 mb-12 flex w-full flex-row items-center justify-between bg-white">
        <div className="relative flex flex-row text-base">
          Total artifacts: <span className="ml-2 block font-bold">{totalDataCount}</span>
        </div>
        <ArtifactsTabNav
          content={typePlaceholder}
          activeArtifactType={activeArtifactType}
          setActiveArtifactType={setActiveArtifactType}
        />
      </header>
    </div>
  );
}
