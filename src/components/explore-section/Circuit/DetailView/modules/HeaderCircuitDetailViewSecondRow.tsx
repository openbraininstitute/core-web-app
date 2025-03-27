import { CircuitSchemaProps } from '../../type';
import HeaderArtifactData from './HeaderArtifactData';
import HeaderMetadataHeader from './HeaderMetadataHeader';

export default function HeaderCircuitDetailViewSecondRow({
  content,
}: {
  content: CircuitSchemaProps;
}) {
  return (
    <div className="relative mt-16 grid w-full grid-cols-2 gap-16">
      <HeaderMetadataHeader content={content} />
      <HeaderArtifactData content={content} />
    </div>
  );
}
