import Link from 'next/link';

import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { IconPlus } from '@/ui/segments/landing/icons/icon-plus';
import { styleButtonHoverable } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import CategoryButton from './category-button';

import type { ContentForNewsItem } from '@/services/sanity/api/get-news-item';

import styles from './card.module.css';

interface CardsProps {
  className?: string;
  news: ContentForNewsItem;
}

export default function Cards({ className, news }: CardsProps) {
  return (
    <div className={classNames(className, styles.card, news.isEPFL && styles.small)}>
      <h1>{news.title}</h1>
      <div className={styles.subtitle}>
        <div>Published {formatDate(news.date)}</div>
        <CategoryButton disabled className="text-gray-500">
          {news.category}
        </CategoryButton>
      </div>
      <div className={styles.content}>
        <div className={styles.text}>
          <div>
            <span>{news.content}</span>
          </div>
          <Link
            href={news.isExternalLink && news.link ? news.link : `/news/${news.slug}`}
            target={news.isExternalLink ? '_blank' : undefined}
            rel={news.isExternalLink ? 'noopener noreferrer' : undefined}
            aria-label={`Read more about ${news.title}`}
            className={classNames(styleButtonHoverable, styles.button)}
          >
            <div>Read more</div>
            <IconPlus />
          </Link>
        </div>
        <ProgressiveImage
          forceAspectRatio
          className={styles.image}
          src={news.imageURL}
          width={news.imageWidth}
          height={news.imageHeight}
          alt={news.title}
        />
      </div>
    </div>
  );
}

function formatDate(d: string) {
  const date = new Date(d);
  const fmt = new Intl.DateTimeFormat('en', { dateStyle: 'long' });
  return fmt.format(date);
}
