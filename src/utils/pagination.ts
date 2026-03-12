/**
 * fetches all paginated data by making multiple requests in chunks.
 *
 * @param fn - Async function that accepts page and page_size parameters
 * @param pageSize - Number of items per request (default: 100)
 * @returns Promise resolving to array of all items
 */
export async function fetchAllPaginatedData<T>({
  fn,
  pageSize = 100,
}: {
  fn: (page: number, pageSize: number) => Promise<{ data: T[]; total?: number }>;
  pageSize: number;
}): Promise<T[]> {
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
