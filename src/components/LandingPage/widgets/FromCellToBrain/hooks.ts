import { useSanity } from '../../content/content';
import {
  FromCellToBrainCard,
  FromCellToBrainColumn,
  isContentForFromCellToBrainColumns,
} from './types';

export function useSanityContentForFromCelltoBrainContent(): FromCellToBrainColumn[] {
  const data =
    useSanity(
      `*[_type=="cardGrid"][0].section[]
{
  title,
  "cardTitle": cards[].title,
  "cardDescription": cards[].description,
  "cardImageURL": cards[].image.asset->url,
  "cardImageWidth": cards[].image.asset->metadata.dimensions.width,
  "cardImageHeight": cards[].image.asset->metadata.dimensions.height,
}`,
      isContentForFromCellToBrainColumns
    ) ?? [];

  return data.map((item) => {
    const cards: FromCellToBrainCard[] = item.cardTitle.map((title, index) => {
      const card: FromCellToBrainCard = {
        title,
        description: item.cardDescription[index],
        imageURL: item.cardImageURL[index],
        imageWidth: item.cardImageWidth[index],
        imageHeight: item.cardImageHeight[index],
      };
      return card;
    });
    const column: FromCellToBrainColumn = {
      title: item.title,
      cards,
    };
    return column;
  });
}
