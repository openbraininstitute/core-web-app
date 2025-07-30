'use client';

import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useFetchSingleType } from '@/components/documentation/hooks/use-entitycore-fetch-single-type';
import { CopyIcon } from '@/components/icons/ArticlesIcons';
import { unslugify } from '@/components/explore-section/utils';

export type CopyButtonProps = {
  content: { pref_label?: string; definition?: string };
};

export default function Page() {
  const { slug } = useParams();
  const [showNotification, setShowNotification] = useState<boolean>(false);

  let name = '';
  if (typeof slug === 'string') {
    name = slug;
  } else if (Array.isArray(slug)) {
    [name] = slug;
  }

  const originalName = unslugify(name);

  const { data, loading, error } = useFetchSingleType({
    name: originalName,
    cellType: 'e-type',
  });

  const handleCopy = useCallback(async () => {
    try {
      const url = window.location.href;

      await navigator.clipboard.writeText(url);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 1500);
    } catch (err) {
      throw new Error(`Failed to copy URL to clipboard: ${err}`);
    }
  }, []);

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

  if (!data || !data.data || !data.data[0]) {
    return (
      <div className="relative w-full text-white">
        <p>No data found for the type: {name}</p>
      </div>
    );
  }

  const content = data.data[0];

  return (
    <div className="relative ml-24 flex w-full flex-col">
      <div className="flex w-full flex-row items-center justify-between">
        <h1 className="text-4xl font-bold">{content?.pref_label || 'Unnamed Type'}</h1>
        <button
          type="button"
          onClick={handleCopy}
          className="border-primary-6 flex h-10 w-10 items-center justify-center border border-solid"
          aria-label="Copy URL to clipboard"
        >
          <CopyIcon iconColor="white" />
        </button>
      </div>

      {showNotification && (
        <div className="fixed top-4 right-4 bg-green-700 px-4 py-2 text-lg text-white">
          Url copied
        </div>
      )}
      <p className="mt-6 text-lg leading-normal font-normal hyphens-auto">{content.definition}</p>
    </div>
  );
}
