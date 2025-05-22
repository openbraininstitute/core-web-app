import { useState } from 'react';
import { ContributorsProps } from '../../type';

import { CloseIcon } from '@/components/icons';

export function SingleContributorPill({ name, lastName }: { name: string; lastName: string }) {
  return (
    <div className="flex flex-row flex-nowrap rounded-full border border-solid border-gray-200 px-4 py-1 text-lg font-normal text-primary-9">
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
  value: ContributorsProps[] | string[];
  slice?: number;
}) {
  const [viewMore, setViewMore] = useState<boolean>(false);

  const contentList = viewMore ? value : value.slice(0, slice);

  return (
    <div className="relative flex w-full flex-col items-start">
      <div className="text-sm font-light uppercase tracking-wider text-gray-500">{name}</div>

      <div className="mt-2 flex flex-row flex-wrap gap-2">
        {contentList.map((item: ContributorsProps | string) => {
          if (typeof item === 'string') {
            return (
              <span
                key={item}
                className="hyphens-auto text-xl font-normal leading-normal text-primary-9"
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

      <button
        type="button"
        aria-label="View more"
        className="mt-2 rounded-full border border-solid border-gray-300 bg-white px-4 py-2 text-base font-normal text-neutral-5"
        onClick={() => setViewMore(true)}
      >
        View more
      </button>

      {viewMore && (
        <div className="fixed left-0 top-0 z-[99999] flex h-screen w-screen items-center justify-center bg-black/60">
          <div className="flex w-2/3 flex-col rounded-md bg-white p-10 text-primary-9">
            <div className="mb-2 flex flex-row justify-between">
              <div className="text-xl font-bold">{name}</div>
              <button
                type="button"
                aria-label="Close view more modal"
                onClick={() => setViewMore(false)}
              >
                <CloseIcon className="h-4 w-4 text-primary-9" />
              </button>
            </div>
            <div className="flex flex-row flex-wrap gap-2">
              {contentList.map((item: ContributorsProps | string) => {
                if (typeof item === 'string') {
                  return (
                    <span
                      key={item}
                      className="flex flex-row items-center hyphens-auto text-xl font-normal leading-normal text-primary-9 before:mr-2 before:block before:h-2 before:w-2 before:rounded-full before:bg-primary-9 before:content-['']"
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
