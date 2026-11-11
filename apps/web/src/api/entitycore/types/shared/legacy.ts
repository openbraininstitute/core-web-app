type Digest = {
  value: string;
  algorithm: string;
};

type RemoteDiskStorage = {
  '@id': string;
  _rev: number;
  '@type': 'RemoteDiskStorage';
};

type AtLocation = {
  '@type': 'Location';
  store: RemoteDiskStorage;
  location: string;
};

type ContentSize = {
  value: number;
  unitCode: string;
};

type LegacyDistribution = {
  name: string;
  '@type': 'DataDownload';
  digest: Digest;
  atLocation: AtLocation;
  contentUrl: string;
  contentSize: ContentSize;
  encodingFormat: string;
};

export type AssetLegacyMeta = {
  meta: {
    legacy: LegacyDistribution;
  };
};
