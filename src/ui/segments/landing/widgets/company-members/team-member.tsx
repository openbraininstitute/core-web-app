'use client';

import NextImage from 'next/image';
import { useState } from 'react';

import { classNames } from '@/util/utils';

import type { ContentForMember } from '@/services/sanity/api/get-members';

import styles from './team-member.module.css';

interface TeamMemberProps {
  className?: string;
  value: ContentForMember;
  big?: boolean;
}

export default function TeamMember({ className, value, big }: TeamMemberProps) {
  const { firstName, lastName, role, imageURL, imageWidth, imageHeight } = value;
  const [ready, setReady] = useState(false);
  const name = `${firstName} ${lastName}`;

  return (
    <div className={classNames(className, styles.teamMember, big && styles.big)}>
      <div className={styles.image}>
        <NextImage
          src={imageURL}
          alt={name}
          width={imageWidth}
          height={imageHeight}
          onLoad={() => setReady(true)}
          className={classNames(ready && styles.ready)}
        />
      </div>
      <div className={styles.name}>{name}</div>
      <div className={styles.profile}>{role}</div>
    </div>
  );
}
