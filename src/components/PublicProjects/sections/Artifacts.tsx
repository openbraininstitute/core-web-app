'use client';

import MEModelTable from '../MEModels/MEModelTable';
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
  return (
    <div className="relative flex w-full flex-col gap-y-12">
      {content?.artifact && <LinkAndDownloadArtifactList content={content.artifact} />}
      {content?.meModelsList && (
        <div className="flex w-full flex-col">
          <div className="mb-8 flex w-full flex-row items-baseline gap-x-3 text-primary-9">
            <h3 className="text-2xl font-bold">ME models</h3>
            <div className="text-base font-normal text-neutral-4">
              Total {content.meModelsList.length}
            </div>
          </div>
          <MEModelTable content={content.meModelsList} />
        </div>
      )}
    </div>
  );
}
