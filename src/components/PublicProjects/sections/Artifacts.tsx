'use client';

import { useState } from 'react';
import EModelTable from '../tables/e-model-table';
import MEModelTable from '../tables/me-model-table';
import SynaptomeTable from '../tables/synaptome-model-table';
import { ShowCaseProjectQueryType } from '../type';
import ArtifactsTabNav from './artifact/artifacts-tab-nav';
import LinkAndDownloadList from './blocs/LinkAndDownloadList';

import { InformationIcon } from '@/components/icons';

const getActiveArtifactsCount = (
  activeArtifactType: string | null,
  content: ShowCaseProjectQueryType
): number => {
  if (!activeArtifactType || !content) {
    return 0;
  }

  switch (activeArtifactType) {
    case 'eModelsTable':
      return Array.isArray(content.eModelTable) ? content.eModelTable.length : 0;
    case 'meModelsTable':
      return Array.isArray(content.meModelTable) ? content.meModelTable.length : 0;
    case 'synaptomesTable':
      return Array.isArray(content.synaptomeTable) ? content.synaptomeTable.length : 0;
    case 'downloadsLinks':
      return Array.isArray(content.artifact) ? content.artifact.length : 0;
    default:
      return 0;
  }
};

export default function ArtifactsSection({ content }: { content: ShowCaseProjectQueryType }) {
  const [activeArtifactType, setActiveArtifactType] = useState<string | null>(
    content.artifactType[0] ?? null
  );

  let activeTable;

  if (content !== null) {
    switch (activeArtifactType) {
      case 'eModelsTable':
        activeTable = <EModelTable content={content.eModelTable} />;
        break;
      case 'meModelsTable':
        activeTable = <MEModelTable content={content.meModelTable} />;
        break;
      case 'synaptomesTable':
        activeTable = <SynaptomeTable content={content.synaptomeTable} />;
        break;
      case 'downloadsLinks':
        activeTable = <LinkAndDownloadList content={content.artifact} />;
        break;
      default:
        activeTable = (
          <div className="text-center text-lg font-bold">No artifacts available for this type.</div>
        );
        break;
    }
  }

  let contentTitle;

  switch (activeArtifactType) {
    case 'eModelsTable':
      contentTitle = 'E-Models';
      break;
    case 'meModelsTable':
      contentTitle = 'ME-Models';
      break;
    case 'synaptomesTable':
      contentTitle = 'Synaptome';
      break;
    case 'downloadsLinks':
      contentTitle = 'Downloads & Links';
      break;
    default:
      contentTitle = '';
      break;
  }

  return (
    <div className="relative flex w-full flex-col gap-y-6 scroll-smooth" id="artifacts">
      <header className="sticky top-0 z-50 flex w-full flex-row items-center justify-between bg-white">
        <div className="relative flex flex-row text-base">
          <div>Total artifacts: </div>
          <span className="ml-2 block font-bold">
            {getActiveArtifactsCount(activeArtifactType, content)}
          </span>
        </div>
        {content.artifactType.length > 1 && (
          <ArtifactsTabNav
            content={content.artifactType}
            activeArtifactType={activeArtifactType}
            setActiveArtifactType={setActiveArtifactType}
          />
        )}
      </header>
      <div className="w-full overflow-hidden">
        <div className="flex w-full flex-row justify-between">
          <div className="text-primary-9 mb-3 w-full text-3xl font-bold">{contentTitle}</div>
          {contentTitle === 'meModelsTable' ||
            (contentTitle === 'eModelsTable' && (
              <p className="flex flex-row items-center text-base font-normal whitespace-nowrap text-gray-400">
                <InformationIcon className="mr-1" iconColor="#9ca3af " />
                To download an artifact, use the radio button to select it and click on the download
                button
              </p>
            ))}
        </div>
        {activeTable}
      </div>
    </div>
  );
}
