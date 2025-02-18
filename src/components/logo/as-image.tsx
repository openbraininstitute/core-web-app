/* eslint-disable react/jsx-props-no-spreading */
import Image from 'next/image';

import { basePath } from '@/config';

type Props = {
  width?: number;
  height?: number;
  className?: string;
} & Omit<React.ComponentProps<typeof Image>, 'src' | 'alt' | 'width' | 'height'>;

export default function ObiLogoImage({ width, height, className = '', ...props }: Props) {
  return (
    <div
      className={`relative  h-[40px] w-[140px]  sm:h-[48px] sm:w-[150px] lg:h-[57px] lg:w-[177px] xl:h-[64px] xl:w-[200px] ${className}`}
    >
      <Image
        priority
        alt="Open Brain Institute"
        src={`${basePath}/images/logo/obi.webp`}
        fill
        className="h-auto w-auto object-contain"
        sizes="(max-width: 768px) 140px, (max-width: 1200px) 177px, 200px"
        {...props}
      />
    </div>
  );
}
