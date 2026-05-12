import React from 'react';

import FeatureLine from './feature-line';

import type {
  ContentForPricingFeatureBloc,
  ContentForPricingPlan,
} from '@/services/sanity/api/get-pricing-features';

import styles from './feature-bloc.module.css';

interface FeatureBlocProps {
  bloc: ContentForPricingFeatureBloc;
  plan: ContentForPricingPlan;
}

export default function FeatureBloc({ bloc, plan }: FeatureBlocProps) {
  return (
    <div className={styles.featureBloc}>
      <div className={styles.title}>
        {bloc.title}
        {!bloc.available && <span className={styles.capsule}>Future release</span>}
      </div>
      {bloc.features.map((feature) => (
        <FeatureLine key={feature.title} feature={feature} plan={plan} available={bloc.available} />
      ))}
    </div>
  );
}
