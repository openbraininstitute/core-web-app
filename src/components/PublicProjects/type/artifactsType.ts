export type EModelsProps = {
  name: string;
  response: string;
  brainRegion: string;
  mType: string | null;
  modelCumulatedScore: number;
  species: string;
  contributors: string | null;
  creationDate: string | null;
  download: string | null;
  downloadLink: string | null;
};

export type MEModelsProps = {
  name: string;
  morphologyThumbnail: string | null;
  traceThumbnail: string | null;
  validated: boolean;
  brainRegion: string;
  mType: string;
  eType: string;
  species: string;
  createdBy: string;
  creationDate: string | null;
  download: string | null;
  downloadLink: string | null;
};

export type SynaptomeProps = {
  name: string;
  description: string;
  MEModel: string;
  MType: string | null;
  EType: string | null;
  brainRegion: string;
  species: string;
  createdBy: string;
  creationDate: string;
  download: string;
};
