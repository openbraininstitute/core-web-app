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
        <p className="mb-6 text-base font-normal leading-normal text-primary-2">{description}</p>
      </div>
      <Image
        src={imgUrl}
        alt="Coming soon banner"
        className="absolute left-0 top-0 z-0 h-auto w-full"
        width={800}
        height={600}
      />
    </div>
  );
}
