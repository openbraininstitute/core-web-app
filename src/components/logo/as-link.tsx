import { HTMLProps } from 'react';
import Link from 'next/link';

import SvgLogo from '@/components/logo/as-svg';
import ImageLogo from '@/components/logo/as-image';
import { classNames } from '@/util/utils';

type Props = {
  href?: string;
  color?: string;
  cls?: {
    container?: HTMLProps<HTMLElement>['className'];
    logo?: HTMLProps<HTMLElement>['className'];
  };
  type?: 'image' | 'svg';
};

export default function ObiLogoLink({
  href = '/',
  color = 'text-white',
  cls,
  type = 'svg',
}: Props) {
  return (
    <Link
      href={href}
      className={classNames(
        'z-10 flex h-auto flex-col justify-center outline-none',
        color,
        cls?.container
      )}
    >
      {type === 'svg' && <SvgLogo fill={color} className={cls?.logo} />}
      {type === 'image' && <ImageLogo width={177} height={57} />}
    </Link>
  );
}
