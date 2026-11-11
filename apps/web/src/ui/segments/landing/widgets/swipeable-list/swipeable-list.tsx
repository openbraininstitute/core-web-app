import SwipeableCardsList from '@/ui/segments/landing/components/swipeable-cards-list/swipeable-cards-list';
import Title from '@/ui/segments/landing/components/text/title';
import { styleBlockSmallExpandRight } from '@/ui/segments/landing/styles';
import { getSection } from '@/ui/segments/landing/utils';

import NewsCard from './card';

import type { ContentForSwipeableList } from '@/services/sanity/api/get-swipeable-list';

interface WidgetSwipeableListProps {
  data: ContentForSwipeableList | null;
}

export function WidgetSwipeableList({ data }: WidgetSwipeableListProps) {
  if (!data) return null;

  const { title, button, link, list } = data;

  if (list.length === 0) return null;

  return (
    <>
      <Title value={title} />
      <SwipeableCardsList
        buttonLabel={button}
        buttonHref={getSection(link).slug}
        className={styleBlockSmallExpandRight}
      >
        {list.map((item, index) => (
          <NewsCard key={index} value={item} />
        ))}
      </SwipeableCardsList>
    </>
  );
}
