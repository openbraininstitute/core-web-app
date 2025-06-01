export type EModelProps = {
  name: string;
  response: string;
  brainRegion: string;
  mType: string | null;
  modelCumulatedScore: number;
  species: string;
  contributors: string;
  creationDate: string;
  download: string;
};

export type MEModelProps = {
  name: string;
  morphologyThumbnail: string;
  traceThumbnail: string;
  validated: boolean;
  brainRegion: string;
  mType: string;
  eType: string;
  species: string;
  createdBy: string;
  creationDate: string;
  download: string;
};
