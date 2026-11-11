import Image from 'next/image';

export default function ComingSoonBanner({
  title,
  description,
  imgUrl,
}: {
  title: string;
  description: string;
  imgUrl: string;
}) {
  return (
    <div className="relative w-full overflow-hidden p-8">
      <div className="relative z-10">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-primary-2 mb-6 text-base leading-normal font-normal">{description}</p>
      </div>
      <Image
        src={imgUrl}
        alt="Coming soon banner"
        className="absolute top-0 left-0 z-0 h-auto w-full"
        width={800}
        height={600}
      />
    </div>
  );
}
