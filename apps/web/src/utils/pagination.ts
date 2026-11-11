import { chunk } from 'es-toolkit/compat';

export const DEFAULT_PAGE_SIZE = 1000;

/**
 * fetches all paginated data by making multiple requests in chunks.
 *
 * @param options - Configuration object
 * @param options.fn - Async function that accepts page and page_size parameters
 * @param options.pageSize - Number of items per request (default: DEFAULT_PAGE_SIZE)
 * @returns Promise resolving to array of all items
 */
export async function fetchAllPaginatedData<T>(options: {
  fn: (page: number, pageSize: number) => Promise<{ data: T[] }>;
  pageSize?: number;
}): Promise<T[]> {
  const { fn, pageSize = DEFAULT_PAGE_SIZE } = options;
  const allData: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await fn(page, pageSize);
    allData.push(...result.data);

    if (result.data.length < pageSize) {
      hasMore = false;
    }

    page++;
  }

  return allData;
}

/**
 * fetches paginated data for each chunk of filter values and merges all pages/chunks into one list
 *
 * useful when an api supports pagination, but large `...__in` filters must be split to keep requests safe
 * usually the chunk size is the same as the page size
 */
export async function fetchAllChunkedPaginatedData<TData, TChunkValue>({
  values,
  fetchPage,
  chunkSize = 50,
  pageSize = 50,
  prepareValues,
}: {
  values: TChunkValue[];
  fetchPage: (params: {
    chunkValues: TChunkValue[];
    page: number;
    pageSize: number;
    chunkIndex: number;
  }) => Promise<{ data: TData[]; total?: number }>;
  chunkSize?: number;
  pageSize?: number;
  prepareValues?: (values: TChunkValue[]) => TChunkValue[];
}): Promise<TData[]> {
  const normalizedValues = prepareValues ? prepareValues(values) : values;
  if (normalizedValues.length === 0) return [];

  const valueChunks = chunk(normalizedValues, chunkSize);
  const dataPerChunk = await Promise.all(
    valueChunks.map((chunkValues, chunkIndex) =>
      fetchAllPaginatedData({
        fn: (page, currentPageSize) =>
          fetchPage({ chunkValues, page, pageSize: currentPageSize, chunkIndex }),
        pageSize,
      })
    )
  );

  return dataPerChunk.flat();
}
