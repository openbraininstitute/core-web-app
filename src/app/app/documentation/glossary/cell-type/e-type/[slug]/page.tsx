'use client';

import { useParams } from 'next/navigation';

import { useFetchSingleType } from '@/components/documentation/hooks/use-entitycore-fetch-single-type';

export function unslugify(slug: string): string {
  return slug.replace(/-/g, ' ');
}

export default function Page() {
  const { slug } = useParams();

  let name = '';
  if (typeof slug === 'string') {
    name = slug;
  } else if (Array.isArray(slug)) {
    [name] = slug;
  }

  const originalName = unslugify(name);

  const { data, loading, error, refetch } = useFetchSingleType({
    name: originalName,
    cellType: 'e-type',
  });

  if (error) {
    throw new Error(`Error fetching data: ${error}`);
  }

  if (!name) {
    return (
      <div className="relative w-full text-white">
        <p className="text-red-500">Error: Invalid or missing ID</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative w-full text-white">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative w-full text-white">
        <p className="text-red-500">Error: {error}</p>
        <button
          onClick={refetch}
          type="button"
          aria-label="Retry fetching data"
          className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || !data.data || !data.data[0]) {
    return (
      <div className="relative w-full text-white">
        <p>No data found for the type: {name}</p>
      </div>
    );
  }

  const content = data.data[0];

  return (
    <div className="relative w-full text-white">
      <h1>{content?.pref_label || 'Unnamed Type'}</h1>
      <p>ID:</p>
      <button
        onClick={refetch}
        type="button"
        aria-label="Refetch data"
        className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Refetch
      </button>
    </div>
  );
}
