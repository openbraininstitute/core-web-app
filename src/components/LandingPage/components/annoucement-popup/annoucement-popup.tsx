import React from 'react';

import Link from 'next/link';
import { IconClose } from '../../icons/IconClose';
import { styleButtonRounded } from '../../styles';
import ProgressiveImage from '../ProgressiveImage';
import Background from './background.jpg';
import { classNames } from '@/util/utils';

import styles from './annoucement-popup.module.css';

export interface AnnoucementPopupProps {
  className?: string;
}

export default function AnnoucementPopup({ className }: AnnoucementPopupProps) {
  const [open, setOpen] = usePopupVisibility();
  const handleClose = () => {
    setOpen(false);
    globalThis.localStorage.setItem(STORAGE_ID, new Date().toUTCString());
  };
  return (
    <div className={classNames(className, styles.annoucementPopup, open && styles.show)}>
      <ProgressiveImage
        className={styles.background}
        src={Background.src}
        width={Background.width}
        height={Background.height}
      />
      <header>
        <button type="button" onClick={handleClose} aria-label="Close">
          <IconClose />
        </button>
      </header>
      <main>
        <h1>Welcome to the Open Brain Institute</h1>
        <div>
          We are excited to announce the launch of our Virtual Labs on March 28. Make sure to
          register your interest in joining and stay up to date.
        </div>
      </main>
      <footer>
        <Link href="/coming-soon" className={classNames(styleButtonRounded, styles.register)}>
          Register
        </Link>
      </footer>
    </div>
  );
}

const STORAGE_ID = 'landing-page/announcement-popup/already-seen';

function usePopupVisibility(): [open: boolean, setOpen: (open: boolean) => void] {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const handleScroll = () => {
      if (globalThis.localStorage.getItem(STORAGE_ID) !== null) return;

      setOpen(true);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return [open, setOpen];
}
