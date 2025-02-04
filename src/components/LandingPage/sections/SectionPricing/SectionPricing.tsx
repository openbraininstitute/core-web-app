import React from 'react';

import Hero from '../../Hero';
import VerticalRuler from '../../VerticalRuler';
import EmailButton from '../../buttons/EmailButton';
// import Subscriptions from './Subscriptions';

import VerticalSpace from '../../VerticalSpace';
import HeroURL from './hero.jpg';
import { classNames } from '@/util/utils';
import styles from './SectionPricing.module.css';

export interface SectionPricingProps {
  className?: string;
}

export default function SectionPricing({ className }: SectionPricingProps) {
  return (
    <div className={classNames(className, styles.sectionPricing)}>
      <Hero
        title="Pricing"
        content="The Open Brain Platform offers flexible pricing tailored to your needs, whether you’re an individual researcher, a lab, or an institution."
        backgroundType="image"
        backgroundURL={HeroURL.src}
        next="Discover our plans"
      />
      <h1>Discover our different lab subscription</h1>
      <p>
        Find the perfect plan for your research needs. From individual projects to large-scale
        initiatives, we offer flexible options to support your brain modeling and simulation goals.
      </p>
      {/* <Subscriptions /> */}
      <VerticalRuler />
      <h1>Need a premium account?</h1>
      <p>
        Contact us to discuss custom pricing tailored to your special usage of the Open Brain
        Platform. We’re here to create solutions that fit your goals.
      </p>
      <VerticalSpace />
      <p>
        <EmailButton email="support@openbraininstitute.org">Need some support?</EmailButton>
      </p>
    </div>
  );
}
