/* eslint-disable no-param-reassign */
/* eslint-disable react/no-array-index-key */
import React from 'react';

import Title from '../../components/Title/Title';
import SwipeableCardsList from '../../components/swipeable-cards-list';
import { gotoSection } from '../../utils';
import { styleBlockSmallExpandRight } from '../../styles';
import NewsCard from './card';
import { useSanityContentForSwipeableList } from './hooks';

export function WidgetSwipeableList() {
  const swipeableList = useSanityContentForSwipeableList();
  if (!swipeableList) return null;

  const { title, button, link, list } = swipeableList;

  if (list.length === 0) return null;

  return (
    <>
      <Title value={title} />
      <SwipeableCardsList
        buttonLabel={button}
        buttonOnClick={() => gotoSection(link)}
        className={styleBlockSmallExpandRight}
      >
        {list.map((item, index) => (
          <NewsCard key={index} value={item} />
        ))}
      </SwipeableCardsList>
    </>
  );
}
