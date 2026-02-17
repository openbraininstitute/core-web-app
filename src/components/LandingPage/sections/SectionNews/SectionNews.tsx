import React from 'react';

import { fetchSanity } from '@/services/sanity';
import { classNames } from '@/util/utils';

import CenteredColumn from '../../components/CenteredColumn';
import {
  type ContentForNewsList,
  isContentForNewsList,
  useSanityContentForNewsListCount,
} from '../../content';
import { styleBlockMedium, styleButtonRounded } from '../../styles';
import Card from './Card';
import CategoryButton from './CategoryButton';

import styles from './SectionNews.module.css';

interface SectionNewsProps {
  className?: string;
  showHeader?: boolean;
}

const PAGE_SIZE = 10;

export default function SectionNews({ className, showHeader = false }: SectionNewsProps) {
  const newsCount = useSanityContentForNewsListCount();
  const [pageStart, setPageStart] = React.useState(0);
  const [newsList, setNewsList] = React.useState<ContentForNewsList>([]);
  const [categories, setCategories] = React.useState<string[]>(ALL_CATEGORY_IDS);
  React.useEffect(() => {
    setNewsList([]);
    setPageStart(0);
  }, []);
  React.useEffect(() => {
    const action = async () => {
      if (pageStart >= newsCount || newsList.length > pageStart) return;

      const page = await fetchNewsPage(pageStart);
      const list = [...newsList];
      page.forEach((item, index) => {
        list[pageStart + index] = item;
      });
      setNewsList(list);
    };
    action();
  }, [pageStart, newsCount, newsList]);
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
      {newsList.length < newsCount && (
        <CenteredColumn>
          <button
            type="button"
            className={styleButtonRounded}
            onClick={() => setPageStart(pageStart + PAGE_SIZE)}
          >
            Load {Math.min(PAGE_SIZE, newsCount - newsList.length)} more article
            {Math.min(PAGE_SIZE, newsCount - newsList.length) > 1 ? 's' : ''}
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

async function fetchNewsPage(start: number): Promise<ContentForNewsList> {
  const query = `*[_type=="news"] | order(customDate desc) [${start}..${start + PAGE_SIZE - 1}] {
  "id": _id,
  title,
  "content": thumbnailIntroduction,
  "isEPFL": isBBPEPFLNews,
  "slug": slug.current,
  "link": externalLink,
  category,
  cardSize,
  "imageURL": thumbnailImage.asset->url,
  "imageWidth": thumbnailImage.asset->metadata.dimensions.width,
  "imageHeight": thumbnailImage.asset->metadata.dimensions.height,
  "date": customDate,
  "isExternalLink": isExternalLink
}`;
  const data = await fetchSanity(query, isContentForNewsList);
  return data ?? [];
}
