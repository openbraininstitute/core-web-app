import React, { useId } from 'react';

import { styleButtonHoverable } from '../../../styles';
import { useNewsLetterSubscription } from './hook';
import { classNames } from '@/util/utils';

import { isValidEMail } from '@/util/email';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import styles from './NewsLetterSubscription.module.css';

export interface NewsLetterSubscriptionProps {
  className?: string;
  onSectionChange(section: EnumSection): void;
}

export default function NewsLetterSubscription({
  className,
  onSectionChange,
}: NewsLetterSubscriptionProps) {
  const [email, setEmail] = React.useState('');
  const [checked, setChecked] = React.useState(false);
  const id = useId();
  const { subscribe, state } = useNewsLetterSubscription();

  if (state === 'input') {
    return (
      <div className={classNames(className, styles.newsLetterSubscription)}>
        <h2>Subscribe to our newsletter</h2>
        <div className={styles.checkbox}>
          <input type="checkbox" id={id} checked={checked} onChange={() => setChecked(!checked)} />
          <label htmlFor={id}>
            I have read and accept the{' '}
            <button type="button" onClick={() => onSectionChange(EnumSection.PrivacyPolicy)}>
              privacy policy
            </button>
          </label>
        </div>
        <input
          placeholder="Enter your email here..."
          value={email}
          onChange={(evt) => setEmail(evt.target.value)}
        />
        <button
          className={styleButtonHoverable}
          type="button"
          disabled={!checked || !isValidEMail(email)}
          onClick={() => subscribe(email)}
        >
          Subscribe
        </button>
      </div>
    );
  }

  return (
    <div className={classNames(className, styles.newsLetterSubscription, styles.accepted)}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <title>check-circle</title>
        <path
          fill="#0a0"
          d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"
        />
      </svg>
      <h2>You’re all set! Some great news will be coming your way soon!</h2>
    </div>
  );
}
