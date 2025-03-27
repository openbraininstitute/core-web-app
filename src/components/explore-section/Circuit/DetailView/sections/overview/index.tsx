import Image from 'next/image';
import { GraphDataImageProps, SingleCircuitListView } from '../../../type';

export default function OverviewSection({ content }: { content: SingleCircuitListView }) {
  return (
    <div className="relative flex w-full flex-col">
      {content.overview.cellStatistics.length > 0 && (
        <div className="relative flex w-full flex-col">
          <div className="mb-12 w-full bg-primary-8 px-4 py-3 text-xl font-normal text-white">
            Cell Statistics
          </div>
          <div className="relative flex w-full flex-col">
            {content.overview.cellStatistics.map((singleImage: GraphDataImageProps) => (
              <Image
                src={singleImage.src}
                alt={singleImage.alt}
                width={singleImage.width}
                height={singleImage.height}
                key={singleImage.alt}
              />
            ))}
          </div>
        </div>
      )}
      {content.overview.cellStatistics.length > 0 && (
        <div className="relative flex w-full flex-col">
          <div className="mb-12 w-full bg-primary-8 px-4 py-3 text-xl font-normal text-white">
            Network Statistics
          </div>
          <div className="relative flex w-full flex-col">
            {content.overview.networkStatistics.map((singleImage: GraphDataImageProps) => (
              <Image
                src={singleImage.src}
                alt={singleImage.alt}
                width={singleImage.width}
                height={singleImage.height}
                key={singleImage.alt}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
