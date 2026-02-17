import { useSanityContentForNewsList } from '@/components/LandingPage/content';

import SwipeableCardsList from '../../components/swipeable-cards-list';
import Title from '../../components/Title';
import { EnumSection } from '../../sections/sections';
import { styleBlockSmallExpandRight } from '../../styles';
import { gotoSection } from '../../utils';
import NewsCard from './NewsCard';

// Number max of news to display.
const HIGHLIGHTS_COUNT = 4;

export function WidgetNews() {
  const news = useSanityContentForNewsList(HIGHLIGHTS_COUNT);

  if (news.length === 0) return null;

  return (
    <>
      <Title value="News and events" />
      <SwipeableCardsList
        className={styleBlockSmallExpandRight}
        buttonLabel="Browse our news"
        buttonOnClick={() => gotoSection(EnumSection.News)}
      >
        {news.map((item, index) => (
          <NewsCard key={index} value={item} />
        ))}
      </SwipeableCardsList>
    </>
  );
}
