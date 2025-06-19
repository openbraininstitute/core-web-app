import { WarningOutlined } from '@ant-design/icons';
import { DataType } from '@/constants/explore-section/list-views';
import {
  ExperimentalTrace,
  ReconstructedNeuronMorphology,
} from '@/types/explore-section/es-experiment';
import PreviewThumbnail from '@/components/explore-section/ExploreSectionListingView/PreviewThumbnail';
import { useSwcContentUrl } from '@/util/content-url';
import { NeuronMorphology } from '@/types/e-model';

type CardVisualizationProps = {
  dataType: DataType;
  resource: ReconstructedNeuronMorphology | ExperimentalTrace | NeuronMorphology;
  height?: number;
  width?: number;
  className?: string;
};

export default function CardVisualization({
  dataType,
  resource,
  className,
  height = 350,
  width = 350,
}: CardVisualizationProps) {
  const contentUrl = useSwcContentUrl(resource.distribution);

  // const swc = useAtomValue(useMemo(() => loadable(swcFileAtom(contentUrl)), [contentUrl]));

  const renderSwc = () => {
    return (
      !!contentUrl && (
        <PreviewThumbnail
          contentUrl={contentUrl}
          className={className}
          dpi={300}
          height={height}
          type={DataType.ExperimentalNeuronMorphology}
          width={width}
        />
      )
    );
  };

  if (dataType === DataType.ExperimentalNeuronMorphology) {
    return renderSwc();
  }
  return (
    <div className="text-primary-7 flex h-full w-full items-center justify-center gap-2">
      <WarningOutlined /> Visualization is not available in this type
    </div>
  );
}
