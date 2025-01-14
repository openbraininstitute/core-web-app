/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { classNames } from '@/util/utils';

import styles from './TeamMember.module.css';

export interface TeamMemberProps {
  className?: string;
  name: string;
  profile: string;
  image: string;
  big?: boolean;
}

export default function TeamMember({ className, name, profile, image, big }: TeamMemberProps) {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const img = new Image();
    img.src = image;
    img.onload = () => setReady(true);
  }, [image]);
  return (
    <div className={classNames(className, styles.teamMember, big && styles.big)}>
      <div className={styles.image}>
        <img src={image} alt={name} className={classNames(ready && styles.ready)} />
      </div>
      <div className={styles.name}>{name}</div>
      <div className={styles.profile}>{profile}</div>
    </div>
  );
}
