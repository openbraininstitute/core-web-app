/* eslint-disable react/no-array-index-key */

import FeatureBloc from './FeatureBloc';
import PlanHeader from './PlanHeader';

import CenteredColumn from '@/components/LandingPage/components/CenteredColumn';
import { useSanityContentForPricing } from '@/components/LandingPage/content/pricing';
import { styleBlockFullWidth, styleBlockSmall } from '@/components/LandingPage/styles';
import { classNames } from '@/util/utils';

import styles from './large-screen.module.css';

export default function LargeScreen() {
  const data = useSanityContentForPricing();

  if (!data) return null;

  const { plans, features } = data;

  return (
    <>
      <CenteredColumn className={styleBlockFullWidth}>
        <div
          className={classNames(styles.priceList)}
          style={{ '--custom-plans-count': plans.length }}
        >
          <div />
          {plans.map((plan, index) => (
            <PlanHeader key={`${plan.title}/${index}`} plan={plan} />
          ))}
          {features.map((bloc, index) => (
            <>
              {index > 0 && <hr className={styles.fullWidth} />}
              <FeatureBloc bloc={bloc} plans={plans} />
            </>
          ))}
        </div>
      </CenteredColumn>
      <div className={styleBlockSmall}>
        <ul className={styles.notesExplanation}>
          <li>*: Expires in 1 year, non-transferable</li>
          <li>**: Retained for 3 months after cancellation</li>
          <li>***: Published data & models</li>
        </ul>
      </div>
    </>
  );
}
