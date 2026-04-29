'use client';

import React from 'react';

import { getNewsPage } from '@/services/sanity/api/get-news-list';
import CenteredColumn from '@/ui/segments/landing/components/centered-column';
import { styleBlockMedium, styleButtonRounded } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import Card from './card';
import CategoryButton from './category-button';

import type { ContentForNewsList } from '@/services/sanity/api/get-news-list';

import styles from './section-news.module.css';

interface SectionNewsProps {
  className?: string;
  showHeader?: boolean;
  initialNews: ContentForNewsList;
  totalCount: number;
}

const PAGE_SIZE = 10;

export default function SectionNews({
  className,
  showHeader = false,
  initialNews,
  totalCount,
}: SectionNewsProps) {
  const [pageStart, setPageStart] = React.useState(PAGE_SIZE);
  const [newsList, setNewsList] = React.useState<ContentForNewsList>(initialNews);
  const [categories, setCategories] = React.useState<string[]>(ALL_CATEGORY_IDS);
  React.useEffect(() => {
    const action = async () => {
      if (pageStart >= totalCount) return;

      const page = await getNewsPage(pageStart, PAGE_SIZE);
      if (page.length === 0) return;

      setNewsList((prev) => {
        if (prev.length >= pageStart + PAGE_SIZE) return prev;
        const list = [...prev];
        page.forEach((item, index) => {
          list[pageStart + index] = item;
        });
        return list;
      });
    };
    action();
  }, [pageStart, totalCount]);
  const handleSwitchAll = () => {
    setCategories(ALL_CATEGORY_IDS);
  };
  const handleSwitchCat = (catId: string) => {
    if (categories.includes(catId)) {
      setCategories(categories.filter((id) => id !== catId));
    } else {
      setCategories([...categories, catId]);
    }
  };
  const newsListOBI = newsList.filter((item) => !item.isEPFL);
  const newsListEPFL = newsList.filter((item) => item.isEPFL);
  const remainingCount = Math.min(PAGE_SIZE, totalCount - newsList.length);

  return (
    <div className={classNames(className, styles.news, styleBlockMedium)}>
      {showHeader && (
        <header>
          <div className={styles.label}>Filter by</div>
          <CategoryButton
            selected={categories.length === CATEGORIES.length}
            onClick={handleSwitchAll}
          >
            All
          </CategoryButton>
          <div className={styles.buttons}>
            {CATEGORIES.map((cat) => (
              <CategoryButton
                key={cat.id}
                onClick={() => handleSwitchCat(cat.id)}
                selected={categories.includes(cat.id)}
              >
                {cat.label}
              </CategoryButton>
            ))}
          </div>
        </header>
      )}
      <main>
        {newsListOBI.map((item) => (
          <Card key={item.id} news={item} />
        ))}
      </main>
      {newsListEPFL.length > 0 && (
        <div className={styles.epflNews}>
          <h1 className={styles.separator}>BBP news highlight</h1>
          <div className={styles.copyright}>Copyright © EPFL - BBP</div>
          <hr className={styles.separator} />
          <div className={styles.epfl}>
            {newsListEPFL.map((item) => (
              <Card key={item.id} news={item} />
            ))}
          </div>
        </div>
      )}
      {newsList.length < totalCount && (
        <CenteredColumn>
          <button
            type="button"
            className={styleButtonRounded}
            onClick={() => setPageStart(pageStart + PAGE_SIZE)}
          >
            Load {remainingCount} more article{remainingCount > 1 ? 's' : ''}
          </button>
        </CenteredColumn>
      )}
    </div>
  );
}

const CATEGORIES: Array<{ id: string; label: string }> = [
  { label: 'BBP news', id: 'BBP news' },
  { label: 'Talk', id: 'Talk' },
  { label: 'New feature', id: 'New feature' },
  { label: 'Paper release', id: 'Paper release' },
  { label: 'Platform update', id: 'Platform update' },
  { label: 'New model', id: 'New model' },
  { label: 'Event', id: 'Event' },
  { label: 'Workshop', id: 'Workshop' },
  { label: 'Knowledge', id: 'Knowledge' },
  { label: 'Milestone', id: 'Milestone' },
];

const ALL_CATEGORY_IDS = CATEGORIES.map((cat) => cat.id);
