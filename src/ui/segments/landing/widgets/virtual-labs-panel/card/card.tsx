import Video from '@/ui/segments/landing/components/video/video';
import { classNames } from '@/util/utils';

import styles from './card.module.css';

type SingleSectionCardProps = {
  index: number;
  title: string;
  description: string;
  video: string;
};

export function SingleSectionCard({ index, title, description, video }: SingleSectionCardProps) {
  return (
    <button className={classNames(styles.card, index > 999 && styles.comingSoon)} type="button">
      <Video className={styles.background} src={video} />
      <div className={styles.content}>
        <div>
          <h2>{title}</h2>
          {index > 999 && <div className={styles.comingSoon}>Releasing soon</div>}
        </div>
        <p>{description}</p>
      </div>
    </button>
  );
}
