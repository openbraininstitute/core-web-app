'use client';

import { useState } from 'react';
import CheckboxFilter from '../CheckboxFilter';
import EModelTable from '../MEModels/EModelTable';
import MEModelTable from '../MEModels/MEModelTable';
import MinimalMEModelTable from '../MEModels/MinimalMEModelTable';
import SingleArtifact from '../SingleArtifact';
import { LinkAndDownloadArtifactProps, ShowCaseProjectQueryType } from '../type';

export function LinkAndDownloadArtifactList({
  content,
}: {
  content: LinkAndDownloadArtifactProps[];
}) {
  return (
    <div className="flex w-full flex-col gap-12">
      {content.map((singleArtifact: LinkAndDownloadArtifactProps) => (
        <SingleArtifact key={`Artifact_${singleArtifact.title}`} content={singleArtifact} />
      ))}
    </div>
  );
}

export default function ArtifactsSection({ content }: { content: ShowCaseProjectQueryType }) {
  const [showMeModels, setShowMeModels] = useState<boolean>(true);
  const [showMinimalMeModels, setShowMinimalMeModels] = useState<boolean>(true);
  const [showEModels, setShowEModels] = useState<boolean>(true);
  const [showDownloadAndLinks, setShowDownloadAndLinks] = useState<boolean>(true);

  const allData = () => {
    let totalData = 0;

    if (content?.artifact && showDownloadAndLinks) {
      totalData += content?.artifact.length ?? 0;
    }
    if (showMeModels && content?.meModelsList.length > 0) {
      totalData += content?.meModelsList?.length ?? 0;
    }
    if (showMinimalMeModels && content?.minimalMeModel.length > 0) {
      totalData += content?.minimalMeModel?.length ?? 0;
    }
    if (showEModels && content?.eModelsList.length > 0) {
      totalData += content?.eModelsList?.length ?? 0;
    }

    return totalData;
  };

  return (
    <div className="relative flex w-full flex-col gap-y-12 scroll-smooth" id="artifacts">
      <header className="sticky mb-12 flex h-16 w-full flex-row items-center justify-between bg-white">
        <div className="relative flex flex-row">
          Total artifacts: <span className="font-bold">{allData()}</span>
        </div>

        <div className="relative flex items-center gap-x-4">
          <div className="mr-3 text-base font-normal text-primary-9">Show Tables</div>
          {content?.artifact && (
            <CheckboxFilter
              value={showDownloadAndLinks}
              setValue={setShowDownloadAndLinks}
              name="Artifacts"
              dataNumber={content?.artifact.length}
              link="#artifacts"
            />
          )}

          {content?.meModelsList && (
            <CheckboxFilter
              value={showMeModels}
              setValue={setShowMeModels}
              name="ME Models"
              dataNumber={content.meModelsList.length}
              link="#meModelsFull"
            />
          )}

          {content?.minimalMeModel && (
            <CheckboxFilter
              value={showMinimalMeModels}
              setValue={setShowMinimalMeModels}
              name="Other ME Models"
              dataNumber={content?.minimalMeModel.length}
              link="#meModelsLight"
            />
          )}

          {content?.eModelsList && (
            <CheckboxFilter
              value={showEModels}
              setValue={setShowEModels}
              name="E Models"
              dataNumber={content.eModelsList.length}
              link="#eModels"
            />
          )}
        </div>
      </header>

      {content?.artifact && <LinkAndDownloadArtifactList content={content.artifact} />}
      {content?.meModelsList && showMeModels && (
        <div className="flex w-full flex-col">
          <div
            className="mb-8 flex w-full flex-row items-baseline gap-x-3 text-primary-9"
            id="meModelsFull"
          >
            <h3 className="text-2xl font-bold">ME models</h3>
            <div className="text-base font-normal text-neutral-4">
              Total {content.meModelsList.length}
            </div>
          </div>
          <MEModelTable content={content.meModelsList} />
        </div>
      )}
      {content?.minimalMeModel && showMinimalMeModels && (
        <div className="flex w-full flex-col">
          <div
            className="mb-8 flex w-full flex-row items-baseline gap-x-3 text-primary-9"
            id="meModelsLight"
          >
            <h3 className="text-2xl font-bold">Others ME models</h3>
            <div className="text-base font-normal text-neutral-4">
              Total {content.minimalMeModel.length}
            </div>
          </div>
          <MinimalMEModelTable content={content.minimalMeModel} />
        </div>
      )}
      {content?.eModelsList && (
        <div className="flex w-full flex-col">
          <div
            className="mb-8 flex w-full flex-row items-baseline gap-x-3 text-primary-9"
            id="eModels"
          >
            <h3 className="text-2xl font-bold">E models</h3>
            <div className="text-base font-normal text-neutral-4">
              Total {content.eModelsList.length}
            </div>
          </div>
          <EModelTable content={content.minimalMeModel} />
        </div>
      )}
    </div>
  );
}
