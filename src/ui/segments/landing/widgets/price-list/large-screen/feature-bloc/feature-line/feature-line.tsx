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
  plans: ContentForPricingPlan[];
  available: boolean;
}

export default function FeatureLine({ feature, plans, available }: FeatureLineProps) {
  return (
    <>
      <div className={classNames(!available && styles.unavailable)}>
        <div>{feature.title}</div>
        {feature.description && (
          <em>
            <small>{feature.description}</small>
          </em>
        )}
      </div>
      {plans.map((plan) => (
        <FeatureCell key={plan.id} plan={plan} feature={feature} available={available} />
      ))}
    </>
  );
}
