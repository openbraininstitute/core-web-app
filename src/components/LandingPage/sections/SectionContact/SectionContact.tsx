import React from 'react';

import Hero from '../../Hero';

import VerticalRuler from '../../VerticalRuler';
import EmailButton from '../../EmailButton';
import HeroURL from './hero.jpg';
import Cards from './Cards';
import { classNames } from '@/util/utils';
import styles from './SectionContact.module.css';

export interface SectionContactProps {
  className?: string;
}

export default function SectionContact({ className }: SectionContactProps) {
  return (
    <div className={classNames(className, styles.sectionContact)}>
      <Hero
        title="Contact"
        content="Discover the passionate scientists, developers, and innovators driving the Open Brain Platform."
        backgroundType="image"
        backgroundURL={HeroURL.src}
        next="How to get in contact"
      />
      <div className={styles.emails}>
        <EmailButton email="support@openbraininstitute.org">Need some support?</EmailButton>
        <EmailButton email="info@openbraininstitute.org">You have a general inquiry?</EmailButton>
      </div>
      <VerticalRuler />
      <h1>Do you want to collaborate with us?</h1>
      <p>
        We invite neuroscience labs and individual scientists to join us in shaping the future of
        brain research. Contribute by integrating your data, requesting new features, and
        participating in user testing. Together, we can refine tools, drive innovation, and create a
        transformative resource for the global neuroscience community. Be part of the journey to
        advance our understanding of the brain!
      </p>
      <Cards />
    </div>
  );
}
