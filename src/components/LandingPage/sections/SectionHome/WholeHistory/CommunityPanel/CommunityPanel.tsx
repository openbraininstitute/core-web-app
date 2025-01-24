import React from 'react';
import Image from 'next/image';

import DiscordLogoURL from './discord-logo.webp';
import { classNames } from '@/util/utils';

import styles from './CommunityPanel.module.css';

export interface CommunityPanelProps {
  className?: string;
}

export default function CommunityPanel({ className }: CommunityPanelProps) {
  return (
    <div className={classNames(className, styles.communityPanel)}>
      <div>
        <h3>Join the OBI</h3>
        <h2>Community</h2>
        <div>
          Exchange with colleagues around the world,
          <br />
          interact with our team and provide ideas to make
          <br />
          the platform grow for the whole community
        </div>
      </div>
      <Image src={DiscordLogoURL} alt="Discord logo" />
    </div>
  );
}
