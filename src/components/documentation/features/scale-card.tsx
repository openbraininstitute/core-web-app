import Image from 'next/image';
import { SingleScaleTypeProps } from '../CONTENT/scale-content';

export default function ScaleCard({ content }: { content: SingleScaleTypeProps }) {
  return (
    <div className="flex w-full flex-col justify-between rounded-lg border border-solid border-primary-8 p-4">
      <div>
        <div className="mb-2 text-2xl font-bold text-white">{content.title}</div>
        <div className="text-lg text-primary-1">{content.description}</div>
      </div>
      <div className="mt-6 flex w-full items-end justify-end">
        <Image
          src={content.image}
          width={120}
          height={120}
          alt={content.title}
          className="rounded-full shadow-superShadow"
        />
      </div>
    </div>
  );
}
