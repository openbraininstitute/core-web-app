import Link from 'next/link';

export default function ParameterBox({
  name,
  value,
  link,
}: {
  name: string;
  value: string | number;
  link?: string;
}) {
  return (
    <div className="relativee flex w-full flex-col">
      <div className="text-sm font-light uppercase tracking-wider text-gray-500">{name}</div>
      {link ? (
        <Link href={link ?? ''} className="text-xl font-normal leading-normal text-primary-9">
          {value}
        </Link>
      ) : (
        <div className="text-xl font-normal leading-normal text-primary-9">{value}</div>
      )}
    </div>
  );
}
