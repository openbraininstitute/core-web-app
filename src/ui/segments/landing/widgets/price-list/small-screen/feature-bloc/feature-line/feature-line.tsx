import React from 'react';

import { classNames } from '@/util/utils';

import FeatureCell from './feature-cell';

import type {
  ContentForPricingFeatureItem,
  ContentForPricingPlan,
} from '@/services/sanity/api/get-pricing-features';

import styles from './feature-line.module.css';

interface FeatureLineProps {
  feature: ContentForPricingFeatureItem;
  plan: ContentForPricingPlan;
  available: boolean;
}

export default function FeatureLine({ feature, plan, available }: FeatureLineProps) {
  return (
    <div className={styles.featureLine}>
      <div className={classNames(!available && styles.unavailable)}>
        <div>{feature.title}</div>
        {feature.description && (
          <em>
            <small>{feature.description}</small>
          </em>
        )}
      </div>
      <FeatureCell plan={plan} feature={feature} available={available} />
    </div>
  );
}
