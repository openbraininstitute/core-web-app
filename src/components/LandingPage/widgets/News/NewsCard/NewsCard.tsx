import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';
import type { ContentForNewsItem } from '@/components/LandingPage/content';
import { EnumSection } from '@/components/LandingPage/sections/sections';
import { getSection } from '@/components/LandingPage/utils';
import { classNames } from '@/util/utils';

import styles from './NewsCard.module.css';

interface NewsCardProps {
  className?: string;
  value: ContentForNewsItem;
}

export default function NewsCard({ className, value }: NewsCardProps) {
  return (
    <button
      className={classNames(className, styles.newsCard)}
      type="button"
      onClick={() => gotoNews(value)}
    >
      <div className={styles.content}>
        <h2>{value.title}</h2>
        <small>Published {formatDate(value.date)}</small>
        <p>{value.content}</p>
      </div>
      <div className={styles.picture}>
        <ProgressiveImage
          src={value.imageURL}
          alt={value.title}
          width={value.imageWidth}
          height={value.imageHeight}
        />
      </div>
    </button>
  );
}

function formatDate(d: string) {
  const date = new Date(d);
  const fmt = new Intl.DateTimeFormat('en', { dateStyle: 'long' });
  return fmt.format(date);
}

function gotoNews(news: ContentForNewsItem): void {
  if (news.link) {
    window.open(news.link, '_BLANK');
  } else {
    const section = getSection(EnumSection.News);
    const url = `${section.slug}/${news.id}`;
    window.location.href = url;
  }
}
