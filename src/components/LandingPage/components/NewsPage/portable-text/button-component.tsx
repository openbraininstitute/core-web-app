import Link from 'next/link';

import Image from 'next/image';
import { ButtonBlockValue } from '../NewsPage';

export default function ButtonComponent({ value }: { value: ButtonBlockValue }) {
  const link = value.buttonType === 'file' ? value.file : value.link;

  return (
    <Link
      href={link}
      className="text-primary-9! my-12 flex h-50 w-full flex-row items-center overflow-hidden rounded-2xl bg-gray-100 no-underline!"
      style={{ boxShadow: '0px 22px 32px -6px rgba(0,0,0,0.2)' }}
    >
      <div className="w-1/2">
        <Image
          src={value.image}
          alt={value.label}
          width={500}
          height={300}
          className="object-cover"
        />
      </div>
      <div className="flex w-1/2 flex-col p-12">
        <div className="mb-px text-4xl leading-tight font-semibold">{value.label}</div>
        <div className="text-lg text-gray-500">
          {value.buttonType === 'file' ? 'Download File' : 'Read more'}
        </div>
      </div>
    </Link>
  );
}
