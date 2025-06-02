'use client';

import { useState } from 'react';
import E_MODEL_CONTENT from '../tables/content/E-MODEL-CONTENT';
import EModelTable from '../tables/e-model-table';
import MEModelTable from '../tables/me-model-table';
import SynaptomeTable from '../tables/synaptome-model-table';
import { ShowCaseProjectQueryType } from '../type';
import ArtifactsTabNav from './artifact/artifacts-tab-nav';

export type ArticfactTypeProps = {
  id: string;
  name: string;
};

export const typePlaceholder: ArticfactTypeProps[] = [
  { id: 'eModelsTable', name: 'E-Models' },
  { id: 'meModelsTable', name: 'ME-Models' },
  { id: 'synaptome', name: 'Synaptomes' },
  { id: 'downloadsLinks', name: 'Downloads & Links' },
];

export default function ArtifactsSection({ content }: { content: ShowCaseProjectQueryType }) {
  const [activeArtifactType, setActiveArtifactType] = useState<ArticfactTypeProps | null>(
    typePlaceholder[0]
  );

  const totalDataCount =
    (content?.artifact?.length ?? 0) +
    (content?.meModelsList?.length ?? 0) +
    (content?.minimalMeModel?.length ?? 0) +
    (content?.eModelTable?.length ?? 0);

  let activeTable;

  console.log('Full content', content);

  if (content !== null) {
    switch (activeArtifactType?.id) {
      case 'eModelsTable':
        activeTable = <EModelTable content={content.eModelTable} />;
        break;
      case 'meModelsTable':
        activeTable = <MEModelTable content={content.meModelTable} />;
        break;
      case 'synaptome':
        activeTable = <SynaptomeTable content={content.synaptomeTable} />;
        break;
      default:
        activeTable = <EModelTable content={E_MODEL_CONTENT} />;
        break;
    }
  }

  return (
    <div className="relative flex w-full flex-col gap-y-6 scroll-smooth" id="artifacts">
      <header className="sticky top-0 z-50 flex w-full flex-row items-center justify-between bg-white">
        <div className="relative flex flex-row text-base">
          Total artifacts: <span className="ml-2 block font-bold">{totalDataCount}</span>
        </div>
        <ArtifactsTabNav
          content={typePlaceholder}
          activeArtifactType={activeArtifactType}
          setActiveArtifactType={setActiveArtifactType}
        />
      </header>
      <div className="w-full overflow-hidden">
        <div className="mb-3 w-full text-3xl font-bold text-primary-9">
          {activeArtifactType?.name}
        </div>
        {activeTable}
      </div>
    </div>
  );
}
