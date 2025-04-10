import Image from 'next/image';
import { MEModelsProps } from '../type';

export default function MEModelRow({ content, index }: { content: MEModelsProps; index: number }) {
  const name = (text: string, maxLength: number) => {
    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="flex w-full flex-col">
      {index !== 0 && <div className="bg-neutral-2 my-4 h-px w-full" />}
      <div className="text-primary-9 relative flex w-full flex-row items-center text-base">
        <div className="w-[350px]">{name(content.name, 40)}</div>
        <div className="w-[116px]">
          <Image
            src={content.morphology}
            width={400}
            height={400}
            alt={`Image of the morphology of ${content.name}`}
            className="border-neutral-2 h-20 w-auto border border-solid"
          />
        </div>
        <div className="w-[116px]">
          <Image
            src={content.trace}
            width={400}
            height={400}
            alt={`Image of the trace of ${content.name}`}
            className="border-neutral-2 h-20 w-auto border border-solid"
          />
        </div>
        <div className="w-24">{content.validated ? 'True' : 'False'}</div>
        <div className="w-[200px]">{content.brainRegion}</div>
        <div className="w-28">{content.mType}</div>
        <div className="w-28">{content.eType}</div>
      </div>
    </div>
  );
}
