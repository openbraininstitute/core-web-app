/* eslint-disable @next/next/no-img-element */
import React from 'react';

import NextImage from 'next/image';
import { classNames } from '@/util/utils';

import { ContentForMember } from '@/components/LandingPage/content';
import styles from './TeamMember.module.css';

export interface TeamMemberProps {
  className?: string;
  value: ContentForMember;
  big?: boolean;
}

export default function TeamMember({ className, value, big }: TeamMemberProps) {
  const { firstName, lastName, role, imageURL, imageWidth, imageHeight } = value;
  const ready = useImageReady(imageURL);
  const name = `${firstName} ${lastName}`;

  return (
    <div className={classNames(className, styles.teamMember, big && styles.big)}>
      <div className={styles.image}>
        <NextImage
          src={imageURL}
          alt={name}
          width={imageWidth}
          height={imageHeight}
          className={classNames(ready && styles.ready)}
        />
      </div>
      <div className={styles.name}>{name}</div>
      <div className={styles.profile}>{role}</div>
    </div>
  );
}

function useImageReady(imageURL: string) {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const img = new Image();
    img.onload = () => setReady(true);
    img.src = imageURL;
  }, [imageURL]);
  return ready;
}
