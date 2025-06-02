'use client';

import { useState } from 'react';
import E_MODEL_CONTENT from '../tables/content/E-MODEL-CONTENT';
import ME_MODEL_CONTENT from '../tables/content/ME-MODEL-CONTENT';
import EModelTable from '../tables/e-model-table';
import MEModelTable from '../tables/me-model-table';
import { ShowCaseProjectQueryType } from '../type';
import ArtifactsTabNav from './artifact/artifacts-tab-nav';

export const typePlaceholder = [
  { id: 'eModelsTable', name: 'E-Model' },
  { id: 'meModelsTable', name: 'ME-Model' },
  { id: 'synaptome', name: 'Synaptome' },
  { id: 'downloadsLinks', name: 'Downloads & Links' },
];

// {title: 'Downloads & Links', value: 'downloadsLinks'},
//           {title: 'ME Model', value: 'meModel'},
//           {title: 'M Model', value: 'mModel'},
//           {title: 'E Model', value: 'eModel'},
//           {title: 'ME-models table', value: 'meModelsTable'},
//           {title: 'E-models table', value: 'eModelsTable'},
//           {title: 'Synaptome', value: 'synaptome'},
//           {title: 'Single Cell Experiment', value: 'singleCellExperiment'},

export default function ArtifactsSection({ content }: { content: ShowCaseProjectQueryType }) {
  const [activeArtifactType, setActiveArtifactType] = useState<string | null>(
    typePlaceholder[0].id
  );

  const totalDataCount =
    (content?.artifact?.length ?? 0) +
    (content?.meModelsList?.length ?? 0) +
    (content?.minimalMeModel?.length ?? 0) +
    (content?.eModelsList?.length ?? 0);

  let activeTable;

  if (content !== null) {
    switch (activeArtifactType) {
      case 'eModelsTable':
        activeTable = <EModelTable content={E_MODEL_CONTENT} />;
        break;
      case 'meModelsTable':
        activeTable = <MEModelTable content={ME_MODEL_CONTENT} />;
        break;
      default:
        activeTable = <EModelTable content={E_MODEL_CONTENT} />;
        break;
    }
  }

  return (
    <div className="relative flex w-full flex-col gap-y-12 scroll-smooth" id="artifacts">
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
      <div className="w-full overflow-hidden">{activeTable}</div>
    </div>
  );
}
