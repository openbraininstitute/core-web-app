import React from 'react';

import { useSanityContentForNewsList } from '../../content';
import { styleBlockMedium } from '../../styles';
import Card from './Card';
import CategoryButton from './CategoryButton';
import { classNames } from '@/util/utils';

import styles from './SectionNews.module.css';

export interface SectionNewsProps {
  className?: string;
  showHeader?: boolean;
}

export default function SectionNews({ className, showHeader = false }: SectionNewsProps) {
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

  newsList.forEach((news) => {
    console.debug(news.category);
    if (news.title.includes('Neuron Phenotype Ontology')) {
      console.debug(news);
    }
  });

  return (
    <>
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
          {newsList
            .filter((item) => !item.isEPFL)
            .filter((item) => categories.includes(item.category))
            .map((item) => (
              <Card key={item.id} news={item} />
            ))}
        </main>
        <h1 className={styles.separator}>BBP news highlight</h1>
        <div className={styles.copyright}>Copyright © EPFL - BBP</div>
        <hr className={styles.separator} />
        <div className={styles.epfl}>
          {newsList
            .filter((item) => item.isEPFL)
            .filter((item) => categories.includes(item.category))
            .map((item) => (
              <Card key={item.id} news={item} />
            ))}
        </div>
      </div>
    </>
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
