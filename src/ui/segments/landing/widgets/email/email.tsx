import React from 'react';

import EmailButton from '@/ui/segments/landing/components/buttons/email-button';
import { styleBlockSmall } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import type { ContentForEmail } from '@/services/sanity/api/get-email-content';

import styles from './email.module.css';

interface WidgetEmailProps {
  className?: string;
  data: ContentForEmail | null;
}

export function WidgetEmail({ className, data }: WidgetEmailProps) {
  return (
    <div className={classNames(className, styles.widgetEmail, styleBlockSmall)}>
      {data && <EmailButton email={data.email}>{data.label}</EmailButton>}
    </div>
  );
}
