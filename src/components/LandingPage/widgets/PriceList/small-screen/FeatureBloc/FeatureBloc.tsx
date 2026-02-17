import FeatureLine from './FeatureLine';

import type {
  ContentForPricingFeatureBloc,
  ContentForPricingPlan,
} from '@/components/LandingPage/content/pricing';

import styles from './FeatureBloc.module.css';

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
