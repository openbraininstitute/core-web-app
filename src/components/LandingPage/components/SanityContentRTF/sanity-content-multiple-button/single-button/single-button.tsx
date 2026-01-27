import Link from 'next/link';
import { IconDownloadFile } from '@/components/LandingPage/icons/IconDownloadFile';
import { classNames } from '@/util/utils';
import ProgressiveImage from '../../../ProgressiveImage';

import styles from './single-button.module.css';

interface SingleButtonProps {
  className?: string;
  value: {
    title: string;
    href: string;
    backgroundURL: string;
    backgroundWidth: number;
    backgroundHeight: number;
  };
}

export function SingleButton({ className, value }: SingleButtonProps) {
  return (
    <Link className={classNames(className, styles.singleButton)} href={value.href} target="_BLANK">
      <ProgressiveImage
        className={styles.background}
        src={value.backgroundURL}
        width={value.backgroundWidth}
        height={value.backgroundHeight}
      />
      <div>
        <div>Download the PDF</div>
        <h1>{value.title}</h1>
      </div>
      <IconDownloadFile />
    </Link>
  );
}
