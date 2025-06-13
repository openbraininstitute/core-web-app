'use client';

import { useState } from 'react';
import EModelTable from '../tables/e-model-table';
import MEModelTable from '../tables/me-model-table';
import SynaptomeTable from '../tables/synaptome-model-table';
import { ShowCaseProjectQueryType } from '../type';
import ArtifactsTabNav from './artifact/artifacts-tab-nav';
import LinkAndDownloadList from './blocs/LinkAndDownloadList';

export default function ArtifactsSection({ content }: { content: ShowCaseProjectQueryType }) {
  const [activeArtifactType, setActiveArtifactType] = useState<string | null>(
    content.artifactType[0] ?? null
  );

  const totalDataCount =
    (content?.artifact?.length ?? 0) +
    (content?.meModelsList?.length ?? 0) +
    (content?.minimalMeModel?.length ?? 0) +
    (content?.eModelTable?.length ?? 0);

  let activeTable;

  console.log('Full content', content);

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
      contentTitle = 'E Models';
      break;
    case 'meModelsTable':
      contentTitle = 'ME Models';
      break;
    case 'synaptomesTable':
      contentTitle = 'Synaptome';
      break;
    case 'downloadsLinks':
      contentTitle = 'Downloads & Links';
      break;
    default:
      contentTitle = activeArtifactType
        ? activeArtifactType.charAt(0).toUpperCase() + activeArtifactType.slice(1)
        : '';
      break;
  }

  return (
    <div className="relative flex w-full flex-col gap-y-6 scroll-smooth" id="artifacts">
      <header className="sticky top-0 z-50 flex w-full flex-row items-center justify-between bg-white">
        <div className="relative flex flex-row text-base">
          Total artifacts: <span className="ml-2 block font-bold">{totalDataCount}</span>
        </div>
        <ArtifactsTabNav
          content={content.artifactType}
          activeArtifactType={activeArtifactType}
          setActiveArtifactType={setActiveArtifactType}
        />
      </header>
      <div className="w-full overflow-hidden">
        <div className="text-primary-9 mb-3 w-full text-3xl font-bold">{contentTitle}</div>
        {activeTable}
      </div>
    </div>
  );
}
