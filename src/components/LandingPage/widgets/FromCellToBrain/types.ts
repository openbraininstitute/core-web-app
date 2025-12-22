import { tryType } from '../../content';

export interface FromCellToBrainColumn {
  title: string;
  cards: FromCellToBrainCard[];
}

export interface FromCellToBrainCard {
  title: string;
  description: string;
  imageURL: string;
  imageWidth: number;
  imageHeight: number;
}

type ContentForFromCellToBrainColumn = {
  title: string;
  cardTitle: string[];
  cardDescription: string[];
  cardImageURL: string[];
  cardImageWidth: number[];
  cardImageHeight: number[];
};

export function isContentForFromCellToBrainColumns(
  data: unknown
): data is ContentForFromCellToBrainColumn[] {
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
