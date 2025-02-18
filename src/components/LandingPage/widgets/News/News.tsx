/* eslint-disable no-param-reassign */
/* eslint-disable react/no-array-index-key */
import React from 'react';

import { styleBlockSmall } from '../../styles';
import Title from '../../components/Title';
import NewsCard from './NewsCard';
import { ContentForNewsList, useSanityContentForNewsList } from '@/components/LandingPage/content';
import { classNames } from '@/util/utils';
import { IconChevronLeft } from '@/components/LandingPage/icons/IconChevronLeft';
import { IconChevronRight } from '@/components/LandingPage/icons/IconChevronRight';
import styles from './News.module.css';

export interface WidgetNewsProps {
  className?: string;
}

export function WidgetNews({ className }: WidgetNewsProps) {
  const news = useSanityContentForNewsList();
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [newsIndex, setNewsIndex] = React.useState(0);
  const moveTo = useMoveTo(ref.current, news);
  useScrollWatcher(ref.current, news, setNewsIndex);
  const handleMoveLeft = () => {
    moveTo((newsIndex + news.length - 1) % news.length);
  };
  const handleMoveRight = () => {
    moveTo((newsIndex + 1) % news.length);
  };

  if (news.length === 0) return null;

  return (
    <>
      <Title value="News and events" className={styles.header}>
        {news.length > 1 && (
          <nav>
            <button
              className={styles.arrow}
              type="button"
              onClick={handleMoveLeft}
              aria-label="Previous news"
            >
              <IconChevronLeft />
            </button>
            {news.map((_, index) => (
              <button
                className={classNames(styles.page, index === newsIndex && styles.selected)}
                key={index}
                onClick={() => moveTo(index)}
                type="button"
                aria-label={`Go to news #${index + 1}`}
              />
            ))}
            <button
              className={styles.arrow}
              type="button"
              onClick={handleMoveRight}
              aria-label="Next news"
            >
              <IconChevronRight />
            </button>
          </nav>
        )}
      </Title>
      <main ref={ref} className={classNames(className, styles.news, styleBlockSmall)}>
        {news.map((item, index) => (
          <NewsCard key={index} value={item} />
        ))}
      </main>
    </>
  );
}

function useMoveTo(div: HTMLDivElement | null, news: ContentForNewsList) {
  return React.useCallback(
    (index: number) => {
      if (!div || news.length === 0) return;

      const scroll = (index * div.scrollWidth) / news.length;
      div.scrollLeft = scroll;
    },
    [div, news]
  );
}

function useScrollWatcher(
  div: HTMLDivElement | null,
  news: ContentForNewsList,
  setNewsIndex: React.Dispatch<React.SetStateAction<number>>
) {
  React.useEffect(() => {
    if (!div || news.length === 0) return;

    const handleScroll = () => {
      const section = div.scrollWidth / news.length;
      const newsIndex = Math.floor(div.scrollLeft / section);
      setNewsIndex(newsIndex);
    };
    div.addEventListener('scroll', handleScroll);
    return () => div.removeEventListener('scroll', handleScroll);
  }, [div, news, setNewsIndex]);
}
