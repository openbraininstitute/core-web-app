import Link from 'next/link';

type Props = {
  topLink: string;
  topText: string;
  bottomLink: string;
  bottomText: string;
};

export default function DiscoverLinks({ topLink, topText, bottomLink, bottomText }: Props) {
  return (
    <div className="flex w-full flex-col gap-[2px]">
      <Link
        href={topLink}
        className="text-primary-8 inline-block w-full bg-white p-4 font-semibold"
      >
        {topText}
      </Link>
      <Link
        href={bottomLink}
        className="bg-primary-7 inline-block w-full p-4 font-semibold text-white"
      >
        {bottomText}
      </Link>
    </div>
  );
}
