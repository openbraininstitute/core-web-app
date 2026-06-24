import { getClient } from '@/services/sanity/client';
import { tryType } from '@/services/sanity/type-utils';
import { logError } from '@/utils/logger';

export interface FromCellToBrainCard {
  title: string;
  description: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

export interface FromCellToBrainColumn {
  title: string;
  cards: FromCellToBrainCard[];
}

interface RawFromCellToBrainColumn {
  title: string;
  cardTitle: string[];
  cardDescription: string[];
  cardImageURL: string[];
  cardImageWidth: number[];
  cardImageHeight: number[];
}

function isContentForFromCellToBrainColumns(data: unknown): data is RawFromCellToBrainColumn[] {
  return tryType('ContentForFromCellToBrainColumn', data, [
    'array',
    {
      title: 'string',
      cardTitle: ['array', 'string'],
      cardImageURL: ['array', 'string'],
      cardImageWidth: ['array', 'number'],
      cardImageHeight: ['array', 'number'],
    },
  ]);
}

export async function getCellToBrainContent(): Promise<FromCellToBrainColumn[]> {
  try {
    const data = await getClient().fetch(
      `*[_type=="cardGrid"][0].section[]{
  title,
  "cardTitle": cards[].title,
  "cardDescription": cards[].description,
  "cardImageURL": cards[].image.asset->url,
  "cardImageWidth": cards[].image.asset->metadata.dimensions.width,
  "cardImageHeight": cards[].image.asset->metadata.dimensions.height,
}`
    );
    if (isContentForFromCellToBrainColumns(data)) {
      return data.map((item) => ({
        title: item.title,
        cards: item.cardTitle.map((title, index) => ({
          title,
          description: item.cardDescription[index],
          imageURL: item.cardImageURL[index],
          imageWidth: item.cardImageWidth[index],
          imageHeight: item.cardImageHeight[index],
        })),
      }));
    }
  } catch (ex) {
    logError('Error fetching cell to brain content:', ex);
  }
  return [];
}
