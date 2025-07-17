import { useState } from 'react';
import { ContributorsProps } from '../../type';

import { CloseIcon } from '@/components/icons';

function SingleContributorPill({ name, lastName }: { name: string; lastName: string }) {
  return (
    <div className="text-primary-9 flex flex-row flex-nowrap rounded-full border border-solid border-gray-200 px-4 py-1 text-lg font-normal">
      <span>
        {name} {lastName}
      </span>
    </div>
  );
}

export default function ListParameterBox({
  name,
  value,
  slice = 5,
}: {
  name: string;
  value: ContributorsProps[] | string[] | string;
  slice?: number;
}) {
  const [viewMore, setViewMore] = useState<boolean>(false);

  let normalizedValue: ContributorsProps[] | string[];
  if (typeof value === 'string') {
    try {
      normalizedValue = JSON.parse(value);
      if (!Array.isArray(normalizedValue)) {
        return (
          <div className="relative flex w-full flex-col items-start">
            <div className="text-sm font-light tracking-wider text-gray-500 uppercase">{name}</div>
            <div className="mt-2 text-red-500">Error: Invalid data format</div>
          </div>
        );
      }
    } catch (error) {
      return (
        <div className="relative flex w-full flex-col items-start">
          <div className="text-sm font-light tracking-wider text-gray-500 uppercase">{name}</div>
          <div className="mt-2 text-red-500">Error: Invalid data format</div>
        </div>
      );
    }
  } else if (Array.isArray(value)) {
    normalizedValue = value;
  } else {
    return (
      <div className="relative flex w-full flex-col items-start">
        <div className="text-sm font-light tracking-wider text-gray-500 uppercase">{name}</div>
        <div className="mt-2 text-red-500">Error: Invalid data provided</div>
      </div>
    );
  }

  const slicedContent = normalizedValue.slice(0, slice);

  return (
    <div className="relative flex w-full flex-col items-start">
      <div className="text-sm font-light tracking-wider text-gray-500 uppercase">{name}</div>

      <div className="mt-2 flex flex-row flex-wrap gap-2">
        {slicedContent.map((item: ContributorsProps | string) => {
          if (typeof item === 'string') {
            return (
              <span
                key={item}
                className="text-primary-9 text-xl leading-normal font-normal hyphens-auto"
              >
                {item}
              </span>
            );
          }
          return (
            <SingleContributorPill
              key={`${item.name}-${item.lastName}`}
              name={item.name}
              lastName={item.lastName}
            />
          );
        })}
      </div>

      {normalizedValue.length > slice && (
        <button
          type="button"
          aria-label="View more"
          className="text-neutral-5 mt-2 rounded-full border border-solid border-gray-300 bg-white px-4 py-2 text-base font-normal"
          onClick={() => setViewMore(true)}
        >
          View more
        </button>
      )}

      {viewMore && (
        <div className="fixed top-0 left-0 z-50 flex h-screen w-screen items-center justify-center bg-black/60">
          <div className="text-primary-9 flex w-2/3 flex-col rounded-md bg-white p-10">
            <div className="mb-2 flex flex-row justify-between">
              <div className="text-xl font-bold">{name}</div>
              <button
                type="button"
                aria-label="Close view more modal"
                onClick={() => setViewMore(false)}
              >
                <CloseIcon className="text-primary-9 h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-row flex-wrap gap-2">
              {normalizedValue.map((item: ContributorsProps | string) => {
                if (typeof item === 'string') {
                  return (
                    <span
                      key={item}
                      className="text-primary-9 before:bg-primary-9 flex flex-row items-center text-xl leading-normal font-normal hyphens-auto before:mr-2 before:block before:h-2 before:w-2 before:rounded-full before:content-['']"
                    >
                      {item}.
                    </span>
                  );
                }
                return (
                  <SingleContributorPill
                    key={`${item.name}-${item.lastName}`}
                    name={item.name}
                    lastName={item.lastName}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
