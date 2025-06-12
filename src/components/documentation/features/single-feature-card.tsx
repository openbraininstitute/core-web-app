import Image from 'next/image';
import { ContentForFeatureItem } from '../type';

export default function SingleFeatureCard({
  content,
  imageNumber,
}: {
  content: ContentForFeatureItem;
  imageNumber: number;
}) {
  return (
    <div className="my-16 mr-12 flex flex-row items-center gap-x-6">
      <div className="h-60 w-60 overflow-hidden rounded-full shadow-superShadow">
        <Image
          src={`/images/documentation/scale_image-0${imageNumber}.webp`}
          alt={`Feature ${imageNumber}`}
          width={500}
          height={500}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex w-3/4 flex-col justify-between p-5 text-white">
        <div>
          <div className="mb-1 text-3xl font-bold">{content.Feature_title}</div>
          <p className="text-lg leading-normal text-primary-1">{content.Description}</p>
        </div>
        <div className="mt-2 flex w-full flex-row gap-x-4 border-y border-solid border-primary-6 py-4">
          <div className="flex flex-row gap-x-2">
            <span className="text-primary-3">Topic:</span>
            <span className="font-semibold">{content.Topic}</span>
          </div>
          <div className="flex flex-row gap-x-2">
            <span className="text-primary-3">Status:</span>
            <span className="font-semibold">{content.Status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
