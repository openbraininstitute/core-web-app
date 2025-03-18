import React from 'react';
import Link from 'next/link';

import { styleButtonSquare } from '@/components/LandingPage/styles';
import { classNames } from '@/util/utils';

import styles from './contact-us.module.css';

export interface ContactUsProps {
  className?: string;
  children: React.ReactNode;
}

export default function ContactUs({ className, children }: ContactUsProps) {
  return (
    <div className={classNames(className, styles.contactUs)}>
      <Link className={styleButtonSquare} href="mailto:support@openbraininstitute.org">
        {children}
      </Link>
    </div>
  );
}
