import React from 'react';

import { classNames } from '@/util/utils';

import type {
  ContentForPricingFeatureItem,
  ContentForPricingPlan,
} from '@/services/sanity/api/get-pricing-features';

import styles from './feature-cell.module.css';

interface FeatureCellProps {
  feature: ContentForPricingFeatureItem;
  plan: ContentForPricingPlan;
  available: boolean;
}

export default function FeatureCell({ feature, plan, available }: FeatureCellProps) {
  const item = feature.plans.find((p) => p.id === plan.id);
  if (!item)
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="1.5em"
        height="1.5em"
        fill="var(--color-neutral)"
      >
        <title>minus</title>
        <path d="M19,13H5V11H19V13Z" />
      </svg>
    );

  const cls = classNames(styles.featureCell, !available && styles.unavailable);
  if (!item.label)
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={cls}>
        <title>check-circle</title>
        <path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
      </svg>
    );

  return (
    <button className={classNames(cls, styles.tooltip)} type="button" data-tooltip={item.tooltip}>
      <span>{item.label}</span>
      {item.tooltip && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="1.5em"
          height="1.5em"
          fill="currentColor"
        >
          <title>information-outline</title>
          <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z" />
        </svg>
      )}
    </button>
  );
}
