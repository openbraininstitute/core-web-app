/* eslint-disable no-param-reassign */
/* eslint-disable react/no-array-index-key */
import React from 'react';

import SwipeableCardsList from '@/ui/segments/landing/components/swipeable-cards-list/swipeable-cards-list';
import Title from '@/ui/segments/landing/components/text/title';
import { styleBlockSmallExpandRight } from '@/ui/segments/landing/styles';

import NewsCard from './news-card';

import type { ContentForNewsList } from '@/services/sanity/api/get-news-list';

interface WidgetNewsProps {
  data: ContentForNewsList;
}

export function WidgetNews({ data }: WidgetNewsProps) {
  if (data.length === 0) return null;

  return (
    <>
      <Title value="News and events" />
      <SwipeableCardsList
        className={styleBlockSmallExpandRight}
        buttonLabel="Browse our news"
        buttonHref="/news"
      >
        {data.map((item, index) => (
          <NewsCard key={index} value={item} />
        ))}
      </SwipeableCardsList>
    </>
  );
}
