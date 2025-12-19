import SwipeableCardsList from '../../components/swipeable-cards-list';
import Title from '../../components/Title/Title';
import { styleBlockSmallExpandRight } from '../../styles';
import { gotoSection } from '../../utils';
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
