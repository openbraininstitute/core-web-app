import React from 'react';

import { useSanityContentForNewsList } from '../../content';
import { styleBlockMedium } from '../../styles';
import Card from './Card';
import CategoryButton from './CategoryButton';
import { classNames } from '@/util/utils';

import styles from './SectionNews.module.css';

export interface SectionNewsProps {
  className?: string;
}

export default function SectionNews({ className }: SectionNewsProps) {
  const [categories, setCategories] = React.useState<string[]>(ALL_CATEGORY_IDS);
  const newsList = useSanityContentForNewsList();
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

  return (
    <>
      <div className={classNames(className, styles.news, styleBlockMedium)}>
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
        <main>
          {newsList
            .filter((item) => categories.includes(item.category))
            .map((item) => (
              <Card key={item.id} news={item} />
            ))}
        </main>
      </div>
    </>
  );
}

const CATEGORIES: Array<{ id: string; label: string }> = [
  { label: 'New feature', id: 'new-feature' },
  { label: 'Paper release', id: 'paper-release' },
  { label: 'Platform update', id: 'platform-update' },
  { label: 'New model', id: 'new-model' },
];

const ALL_CATEGORY_IDS = CATEGORIES.map((cat) => cat.id);
