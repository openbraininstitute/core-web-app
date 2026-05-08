type FetchPageParams<TChunkValue> = {
  chunkValues: TChunkValue[];
  page: number;
  pageSize: number;
  chunkIndex: number;
};

type FetchPageResult<TData> = {
  data: TData[];
};

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function fetchPages<TData>({
  pageSize,
  fetchPage,
}: {
  pageSize: number;
  fetchPage: (page: number, pageSize: number) => Promise<FetchPageResult<TData>>;
}) {
  const data: TData[] = [];
  let page = 1;

  while (true) {
    const response = await fetchPage(page, pageSize);
    data.push(...response.data);

    if (response.data.length < pageSize) break;
    page += 1;
  }

  return data;
}

export async function fetchChunkedPages<TData, TChunkValue>({
  values,
  fetchPage,
  chunkSize,
  pageSize,
  prepareValues,
}: {
  values: TChunkValue[];
  fetchPage: (params: FetchPageParams<TChunkValue>) => Promise<FetchPageResult<TData>>;
  chunkSize: number;
  pageSize: number;
  prepareValues?: (values: TChunkValue[]) => TChunkValue[];
}) {
  const normalizedValues = prepareValues ? prepareValues(values) : values;
  if (normalizedValues.length === 0) return [];

  const dataPerChunk = await Promise.all(
    chunkValues(normalizedValues, chunkSize).map((chunkValues, chunkIndex) =>
      fetchPages({
        pageSize,
        fetchPage: (page, currentPageSize) =>
          fetchPage({ chunkValues, page, pageSize: currentPageSize, chunkIndex }),
      })
    )
  );

  return dataPerChunk.flat();
}
