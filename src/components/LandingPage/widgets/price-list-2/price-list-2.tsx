import { classNames } from '@/util/utils';
import { styleBlockLarge } from '../../styles';
import GeneralList from './general-list';
import { useSanityContentForPriceList2 } from './hooks';
import LabList from './lab-list';
import styles from './price-list-2.module.css';
import SectionTitle from './section-title';

interface WidgetPriceList2Props {
  className?: string;
}

export default function WidgetPriceList2({ className }: WidgetPriceList2Props) {
  const { plans, labList, generalList } = useSanityContentForPriceList2();

  return (
    <div
      className={classNames(className, styles.priceList2, styleBlockLarge)}
      style={{ '--custom-plans-count': plans.length }}
    >
      <div />
      {plans.map((plan) => (
        <h2 key={plan.id}>{plan.title}</h2>
      ))}
      <SectionTitle className={styles.fullWidth}>General</SectionTitle>
      <GeneralList value={generalList} plans={plans} />
      <LabList value={labList} plans={plans} />
    </div>
  );
}
