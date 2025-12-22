import Link from 'next/link';
import React from 'react';

import { styleButtonSquare } from '@/components/LandingPage/styles';
import { classNames } from '@/util/utils';

import styles from './contact-us.module.css';

interface ContactUsProps {
  className?: string;
  children: React.ReactNode;
  email?: string;
}

export default function ContactUs({
  className,
  children,
  email = 'support@openbraininstitute.org',
}: ContactUsProps) {
  return (
    <div className={classNames(className, styles.contactUs)}>
      <Link className={styleButtonSquare} href={`mailto:${email}`}>
        {children}
      </Link>
    </div>
  );
}
