import SingleArtifact from '@/ui/segments/reports/obi-showcases/artifacts/single-artifact';
import { LinkAndDownloadArtifactProps } from '@/ui/segments/reports/obi-showcases/showcase-type';

export default function LinkAndDownloadList({
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
