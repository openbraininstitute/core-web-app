import React from 'react';
import Image from 'next/image';

import PictureURL from './picture.webp';
import { classNames } from '@/util/utils';
import Button from '@/components/LandingPage/buttons/Button';

import styles from './ToolsAndData.module.css';

export interface ToolsAndDataProps {
  className?: string;
}

export default function ToolsAndData({ className }: ToolsAndDataProps) {
  return (
    <div className={classNames(className, styles.toolsAndData)}>
      <div className={styles.section}>
        <div>
          <h2>Blue Brain Tools & Data</h2>
          <div>
            <h3>fostering transparency</h3>
            <p>
              The Open Brain Platform is built on the Blue Brain Project’s legacy. All Blue Brain’s
              tools and services are open source with a permissive license on the Blue Brain
              Project’s Github repository.
            </p>
          </div>
        </div>
        <Image
          src={PictureURL}
          alt="Prefer to go it alone?"
          className={styles.picture}
          width="1200"
          height="800"
        />
      </div>
      <footer>
        <Button subTitle="View on" title="Github" onClick="https://github.com/BlueBrain" />
        <Button
          subTitle="Discover"
          title="Blue Brain Open Data"
          onClick="https://registry.opendata.aws/bluebrain_opendata/"
        />
      </footer>
    </div>
  );
}
