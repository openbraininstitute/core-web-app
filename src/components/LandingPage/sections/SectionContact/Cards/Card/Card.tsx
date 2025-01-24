import React from 'react';

import { classNames } from '@/util/utils';

import styles from './Card.module.css';

export interface CardProps {
  className?: string;
  title: string;
  subTitle: string;
  image: string;
  children: React.ReactNode;
}

export default function Card({ className, children, image, subTitle, title }: CardProps) {
  return (
    <div className={classNames(className, styles.card)}>
      <div>
        <div>{subTitle}</div>
        <h1>{title}</h1>
        <div>{children}</div>
      </div>
      <div style={{ backgroundImage: `url(${image})` }} />
    </div>
  );
}
