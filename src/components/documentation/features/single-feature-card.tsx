import Image from 'next/image';
import type { ContentForFeatureItem } from '../type';

export default function SingleFeatureCard({
  content,
  imageNumber,
}: {
  content: ContentForFeatureItem;
  imageNumber: number;
}) {
  return (
    <div className="mr-12 flex flex-row items-center gap-x-6">
      <div className="shadow-superShadow h-60 w-60 overflow-hidden rounded-full">
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
          <p className="text-primary-1 text-lg leading-normal">{content.Description}</p>
        </div>
        <div className="border-primary-6 mt-2 flex w-full flex-row gap-x-4 border-y border-solid py-4">
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
