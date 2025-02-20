/* eslint-disable no-param-reassign */
/* eslint-disable react/no-array-index-key */
import React from 'react';

import { styleBlockSmallExpandRight } from '../../styles';
import Title from '../../components/Title';
import SwipeableCardsList from '../../components/swipeable-cards-list';
import { gotoSection } from '../../utils';
import { EnumSection } from '../../sections/sections';
import NewsCard from './NewsCard';
import { useSanityContentForNewsList } from '@/components/LandingPage/content';

// Number max of news to display.
const HIGHLIGHTS_COUNT = 4;

export function WidgetNews() {
  const news = useSanityContentForNewsList(HIGHLIGHTS_COUNT);

  if (news.length === 0) return null;

  console.log('🚀 [News] styleBlockSmallExpandRight = ', styleBlockSmallExpandRight); // @FIXME: Remove this line written on 2025-02-19 at 14:09
  return (
    <>
      <Title value="News and events" />
      <SwipeableCardsList
        className={styleBlockSmallExpandRight}
        buttonLabel="Browse all news"
        buttonOnClick={() => gotoSection(EnumSection.News)}
      >
        {news.map((item, index) => (
          <NewsCard key={index} value={item} />
        ))}
      </SwipeableCardsList>
    </>
  );
}
