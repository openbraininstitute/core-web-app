import Image, { StaticImageData } from 'next/image';
import { useState } from 'react';

export type SingleSectionCardProps = {
  title: string;
  description: string;
  image: StaticImageData;
};

export default function SingleSectionCard({
  content,
  index,
}: {
  content: SingleSectionCardProps;
  index: number;
}) {
  const [mouseHover, setMouseHover] = useState<boolean>(false);

  return (
    <div
      className="relative h-[40vh] overflow-hidden border border-solid border-neutral-3 bg-white p-5 transition-colors duration-500 ease-linear hover:bg-neutral-1"
      onMouseOver={() => setMouseHover(true)}
      onFocus={() => setMouseHover(true)}
      onMouseOut={() => setMouseHover(false)}
      onBlur={() => setMouseHover(false)}
    >
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex flex-col">
          <h3 className="text-xl">0{index + 1}</h3>
          <h2 className="-translate-y-[1vh] text-[3.2vw] font-normal">{content.title}</h2>
        </div>
        <div
          style={{ opacity: mouseHover ? 1 : 0 }}
          className="text-lg transition-opacity duration-500 ease-linear"
        >
          {content.description}
        </div>
      </div>
      <Image
        src={content.image}
        alt={content.title}
        className="absolute left-0 z-0 transition-all duration-500 ease-in-out"
        style={{
          transform: mouseHover ? 'scale(1.3) rotate(-12deg)' : 'scale(1) rotate(0deg)',
          filter: mouseHover ? 'grayscale(0%)' : 'grayscale(100%)',
          top: mouseHover ? '-20%' : '-12%',
        }}
        width="900"
        height="600"
      />
    </div>
  );
}
