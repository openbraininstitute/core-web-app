import { classNames } from '@/util/utils';
import styles from './card.module.css';

export type SingleSectionCardProps = {
  index: number;
  title: string;
  description: string;
  video: string;
};

export function SingleSectionCard({ index, title, description, video }: SingleSectionCardProps) {
  return (
    <button className={classNames(styles.card, index > 999 && styles.comingSoon)} type="button">
      <video className={styles.background} src={video} muted autoPlay loop />
      {/* <div className={styles.curtain} /> */}
      {/* <div className={styles.curtain} /> */}
      <div className={styles.content}>
        <div>
          {/* <h3>0{index + 1}</h3> */}
          <h2>{title}</h2>
          {index > 999 && <div className={styles.comingSoon}>Releasing soon</div>}
        </div>
        <div>{description}</div>
      </div>
    </button>
  );
}
