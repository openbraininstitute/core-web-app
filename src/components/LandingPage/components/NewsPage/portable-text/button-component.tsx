import Link from 'next/link';
import { ButtonBlockValue } from '../NewsPage';

export default function ButtonComponent({ value }: { value: ButtonBlockValue }) {
  return (
    <Link href={value.link} className="text-primary-8 relative h-44 w-full p-12">
      {value.label}
    </Link>
  );
}
