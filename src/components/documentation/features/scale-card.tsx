import Image from 'next/image';
import { SingleScaleTypeProps } from '../content/scale-content';

export default function ScaleCard({ content }: { content: SingleScaleTypeProps }) {
  return (
    <div className="border-primary-8 flex w-full flex-col justify-between rounded-lg border border-solid p-4">
      <div>
        <div className="mb-2 text-2xl font-bold text-white">{content.title}</div>
        <div className="text-primary-1 text-lg">{content.description}</div>
      </div>
      <div className="mt-6 flex w-full items-end justify-end">
        <Image
          src={content.image}
          width={120}
          height={120}
          alt={content.title}
          className="shadow-superShadow rounded-full"
        />
      </div>
    </div>
  );
}
