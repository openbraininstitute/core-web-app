import React from 'react';
import Image from 'next/image';

import PictureURL from './picture.webp';
import { classNames } from '@/util/utils';
import Button from '@/components/LandingPage/buttons/Button';

import styles from './OurFoundations.module.css';

export interface OurFoundationsProps {
  className?: string;
}

export default function OurFoundations({ className }: OurFoundationsProps) {
  return (
    <div className={classNames(className, styles.ourFoundations)}>
      <div className={styles.section}>
        <div>
          <h2>Our Foundations: Blue Brain</h2>
          <div>
            <h3>fostering transparency</h3>
            <p>
              The Blue Brain Project was a pioneering scientific initiative hosted at the École
              Polytechnique Fédérale de Lausanne (EPFL). Supported by nearly 300 million CHF
              investment from the Swiss Federal Government, the project successfully completed its
              mission in December 2024, spanning two decades of research to work out how to build
              biologically accurate digital replica of the brain and begin simulation neuroscience.
              <br />
              The project&apos;s legacy includes around 300 peer-reviewed publications, featuring
              more than 1&apos;100 co-authors, and more than a petabyte of data, comprising millions
              of neuronal morphologies, electrophysiological recordings, and meticulously detailed
              digital brain models across multiple scales. With more than 18 million lines of code
              made available in around than 290 open Githun repositories, the project has delivered
              the tools to build, simulate, analyze, and visualize biologically accurate digital
              brain models, to start the era of simulation neuroscience.{' '}
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
