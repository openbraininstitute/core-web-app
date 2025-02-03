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
          <h2>Our Foundations: Blue Brain</h2>
          <div>
            <h3>fostering transparency</h3>
            <p>
              The Open Brain Platform is built on the Blue Brain Project’s legacy. All Blue Brain’s
              tools and services are open source with a permissive license on the Blue Brain
              Project’s Github repository.{' '}
            </p>
          </div>
        </div>
      </div>
      <div className={styles.picture}>
        <Image
          src={PictureURL}
          alt="fostering transparency"
          className={styles.picture}
          width="1200"
          height="800"
        />
      </div>
      <footer>
        <Button
          className={styles.link}
          subTitle="View on"
          title="Github"
          onClick="https://github.com/BlueBrain"
        />
        <Button
          className={styles.link}
          subTitle="Discover the"
          title="BBP data"
          onClick="https://registry.opendata.aws/bluebrain_opendata/"
        />
        <Button
          className={styles.link}
          subTitle="Discover the"
          title="BBP publications"
          onClick="https://portal.bluebrain.epfl.ch/resources/publications/"
        />
        <Button
          className={styles.link}
          subTitle="Discover the"
          title="BBP gallery"
          onClick="https://portal.bluebrain.epfl.ch/gallery/"
        />
        <Button
          className={styles.link}
          subTitle="Discover the"
          title="BBP resources"
          onClick="https://portal.bluebrain.epfl.ch/resources/"
        />
        <Button
          className={styles.link}
          subTitle="Discover the"
          title="BBP Youtube"
          onClick="https://www.youtube.com/@Bluebrainpjt"
        />
      </footer>
    </div>
  );
}
