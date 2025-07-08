import Video from '@/components/LandingPage/components/Video';
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
    <div
      id={`${title}/${index}`}
      className={classNames(styles.card, index > 999 && styles.comingSoon)}
      role="button"
    >
      <Video className={styles.background} src={video} />
      <div className={styles.content}>
        <div>
          <h2>{title}</h2>
          {index > 999 && <div className={styles.comingSoon}>Releasing soon</div>}
        </div>
        <div>{description}</div>
      </div>
    </div>
  );
}
