import Image from 'next/image';
import Link from 'next/link';

export type PortalCardProps = {
  title: string;
  content: string;
  image: string;
  href: string;
};

export default function PortalCard({ title, content, image, href }: PortalCardProps) {
  return (
    <Link
      key={title}
      href={href}
      className="flex w-full flex-row flex-nowrap border-y border-l border-solid border-neutral-2"
    >
      <div className="flex w-3/4 flex-col p-4">
        <div className="text-base uppercase tracking-wider">Portal</div>
        <h2 className="mb-12 font-serif text-3xl font-normal leading-tight">{title}</h2>
        <div>{content}</div>
      </div>
      <div className="h-full w-1/4 overflow-hidden">
        <Image
          src={image}
          alt={title}
          width="800"
          height="800"
          className="h-full w-full object-cover"
        />
      </div>
    </Link>
  );
}
