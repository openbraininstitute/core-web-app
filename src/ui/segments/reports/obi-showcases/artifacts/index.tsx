'use client';

import { useState } from 'react';

import { InformationIcon } from '@/components/icons';
import ArtifactsTabNav from '@/components/PublicProjects/sections/artifact/artifacts-tab-nav';
import EModelTable from '@/components/PublicProjects/tables/e-model-table';
import LinkAndDownloadList from '@/ui/segments/reports/obi-showcases/artifacts/link-and-download-list';
import MEModelTable from '@/ui/segments/reports/obi-showcases/artifacts/tables/me-model-table';
import SynaptomeTable from '@/ui/segments/reports/obi-showcases/artifacts/tables/synpatome-table';
import type { SanityShowcaseType } from '@/ui/segments/reports/obi-showcases/types';

const getActiveArtifactsCount = (
  activeArtifactType: string | null,
  content: SanityShowcaseType
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

export default function ArtifactsSection({ content }: { content: SanityShowcaseType }) {
  const [activeArtifactType, setActiveArtifactType] = useState<string | null>(
    content?.artifactType?.[0] ?? null
  );

  let activeTable;

  if (content !== null) {
    switch (activeArtifactType) {
      case 'eModelsTable':
        activeTable = content.eModelTable ? (
          <EModelTable content={content.eModelTable as any} />
        ) : null;
        break;
      case 'meModelsTable':
        activeTable = content.meModelTable ? (
          <MEModelTable content={content.meModelTable as any} />
        ) : null;
        break;
      case 'synaptomesTable':
        activeTable = content.synaptomeTable ? (
          <SynaptomeTable content={content.synaptomeTable as any} />
        ) : null;
        break;
      case 'downloadsLinks':
        activeTable = content.artifact ? (
          <LinkAndDownloadList content={content.artifact as any} />
        ) : null;
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
      <header className="bg-background sticky top-0 z-50 flex w-full flex-row items-center justify-between">
        <div className="relative flex flex-row text-base">
          <div>Total artifacts: </div>
          <span className="ml-2 block font-bold">
            {getActiveArtifactsCount(activeArtifactType, content)}
          </span>
        </div>
        {content.artifactType && content.artifactType.length > 1 && (
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
