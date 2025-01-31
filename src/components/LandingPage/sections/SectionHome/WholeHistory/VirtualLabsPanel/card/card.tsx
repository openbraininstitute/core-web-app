import styles from './card.module.css';

export type SingleSectionCardProps = {
  index: number;
  title: string;
  description: string;
  video: string;
};

export function SingleSectionCard({ index, title, description, video }: SingleSectionCardProps) {
  return (
    <button className={`${styles.card} bg-neutral-1`} type="button">
      <video className={styles.background} src={video} muted autoPlay loop />
      <div className={styles.content}>
        <div>
          <h3>0{index + 1}</h3>
          <h2>{title}</h2>
        </div>
        <div>{description}</div>
      </div>
    </button>
  );
}
