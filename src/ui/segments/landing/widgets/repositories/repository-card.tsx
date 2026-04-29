'use client';

import { useState } from 'react';

import ProgressiveImage from '@/ui/segments/landing/components/progressive-image/progressive-image';
import { IconEye } from '@/ui/segments/landing/icons/icon-eye';
import { styleButtonHoverable } from '@/ui/segments/landing/styles';
import { classNames } from '@/util/utils';

import type { ContentForRepository } from './hooks';

import styles from './repository-card.module.css';

interface RepositoryCardProps {
  className?: string;
  value: ContentForRepository;
  showHeader?: boolean;
}

export default function RepositoryCard({ className, value, showHeader }: RepositoryCardProps) {
  const [textExpanded, setTextExpanded] = useState<boolean>(false);

  const textContent = textExpanded ? value.description : `${value.description.slice(0, 200)}...`;

  return (
    <div
      className={classNames(
        className,
        'group relative w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-in-out hover:scale-[0.98] hover:shadow-lg'
      )}
    >
      {/* Hero Image */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        {value.imageURL ? (
          <div className="h-full w-full transition-transform duration-300 group-hover:scale-105">
            <ProgressiveImage
              src={value.imageURL}
              width={value.imageWidth}
              height={value.imageHeight}
              className="h-full w-full"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-linear-to-br from-blue-100 to-purple-100">
            <span className="text-4xl font-sans font-bold text-gray-400">
              {value.title?.charAt(0) ?? '?'}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
      </div>

      <div className="p-6">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-primary-9 font-serif! line-clamp-2 text-4xl! group-hover:text-blue-600">
            {value.title}
          </h3>
        </div>

        <p className="text-primary-9 line-clamp-3 leading-normal hyphens-auto">{textContent}</p>
        <button
          type="button"
          aria-label="Read more"
          className="mt-1 text-sm font-light text-gray-500 hover:text-gray-700"
          onClick={() => setTextExpanded(!textExpanded)}
        >
          {textExpanded ? 'Read less' : 'Read more'}
        </button>

        <div className="relative my-4 h-px w-full bg-gray-200" />

        {showHeader && (
          <div className="text-primary-9 mb-4 flex items-center text-base">
            <span className="font-medium">Type:</span>
            <span className="ml-1">{value.type}</span>
          </div>
        )}
      </div>
      <div className={styles.buttons}>
        {value.buttons.map((btn) => (
          <a
            className={classNames(styles.button, styleButtonHoverable)}
            href={btn.link}
            target="_blank"
            key={btn.title}
            rel="noopener"
          >
            <div>{btn.title ?? 'View resource'}</div>
            <IconEye />
          </a>
        ))}
      </div>
    </div>
  );
}
