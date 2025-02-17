import React from 'react';

import { EMailTypes, useSanityContentForEMail } from '../../content/email';
import EmailButton from '../../components/buttons/EmailButton';
import { styleBlockSmall } from '../../styles';
import { classNames } from '@/util/utils';

import styles from './Email.module.css';

export interface WidgetEmailProps {
  className?: string;
  type: EMailTypes;
}

export function WidgetEmail({ className, type }: WidgetEmailProps) {
  const content = useSanityContentForEMail(type);

  return (
    <div className={classNames(className, styles.widgetEmail, styleBlockSmall)}>
      {content && <EmailButton email={content.email}>{content.label}</EmailButton>}
    </div>
  );
}
