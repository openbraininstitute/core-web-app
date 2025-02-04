import React from 'react';

import FeatureLine from './FeatureLine';
import {
  ContentForPricingFeatureBloc,
  ContentForPricingPlan,
} from '@/components/LandingPage/content/pricing';

import styles from './FeatureBloc.module.css';

export interface FeatureBlocProps {
  bloc: ContentForPricingFeatureBloc;
  plans: ContentForPricingPlan[];
}

export default function FeatureBloc({ bloc, plans }: FeatureBlocProps) {
  return (
    <>
      <div className={styles.title}>
        {bloc.title}
        {!bloc.available && <span className={styles.capsule}>Future release</span>}
      </div>
      {bloc.features.map((feature) => (
        <FeatureLine
          key={feature.title}
          feature={feature}
          plans={plans}
          available={bloc.available}
        />
      ))}
    </>
  );
}
