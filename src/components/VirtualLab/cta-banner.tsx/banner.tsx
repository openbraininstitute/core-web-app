import Link from 'next/link';
import SquareAddIcon from '@/components/icons/SquareAddIcon';

type Props = {
  title: string;
  subtitle: string;
  href: string;
};

export default function CTABanner({ title, subtitle, href }: Props) {
  return (
    <Link
      type="button"
      href={href}
      className="relative flex w-full items-center justify-between rounded-lg bg-[#348537] p-8 text-white hover:text-white"
    >
      <div className="z-2 flex flex-col gap-2 text-left">
        <h4 className="text-2xl font-bold">{title}</h4>
        <p>{subtitle}</p>
      </div>
      <SquareAddIcon />
    </Link>
  );
}
