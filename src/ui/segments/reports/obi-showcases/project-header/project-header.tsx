import Image from 'next/image';

import { getShowcaseCategoryStyle } from '@/ui/segments/reports/obi-showcases/project-header/category-styles';

import type { SanityShowcaseType } from '@/ui/segments/reports/obi-showcases/types';

import styles from '@/ui/segments/reports/obi-showcases/project-header/project-header.module.css';

function formatProjectDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function resolveProjectCategory(content: SanityShowcaseType): string | null {
  return content.projectCategory ?? content.category ?? null;
}

function resolveProjectType(content: SanityShowcaseType): string | null {
  return content.projectType ?? content.type ?? null;
}

function resolveProjectDate(content: SanityShowcaseType): string | null {
  return (
    formatProjectDate(content.projectDate) ??
    formatProjectDate(content.customDate) ??
    formatProjectDate(content.date) ??
    formatProjectDate(content._updatedAt)
  );
}

export default function ProjectHeader({ content }: { content: SanityShowcaseType }) {
  const category = resolveProjectCategory(content);
  const categoryStyle = getShowcaseCategoryStyle(category);
  const projectType = resolveProjectType(content);
  const projectDate = resolveProjectDate(content);

  return (
    <header className={styles.projectHeader}>
      {(category || projectType || projectDate) && (
        <div className={styles.projectHeaderMeta}>
          {category && (
            <span
              className={styles.projectCategory}
              style={{
                color: categoryStyle.color,
                borderColor: categoryStyle.borderColor,
              }}
            >
              {category}
            </span>
          )}
          {projectType && <span className={styles.projectType}>{projectType}</span>}
          {projectDate && <span className={styles.projectDate}>{projectDate}</span>}
        </div>
      )}

      <div className={styles.projectHeaderBody}>
        <div className={styles.projectHeaderText}>
          <h1 className={styles.projectTitle}>{content.name}</h1>
          {content.introduction && (
            <p className={styles.projectDescription}>{content.introduction}</p>
          )}
        </div>

        {content.heroImage && (
          <div className={styles.projectHeaderMedia}>
            <Image
              alt={content.name}
              className={styles.projectHeroImage}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              src={content.heroImage}
            />
          </div>
        )}
      </div>

      {content.authorsList.length > 0 && (
        <div className={styles.projectAuthors}>
          <span className={styles.projectAuthorsLabel}>Authors:</span>
          {content.authorsList.map((author, index) => (
            <span key={`${author.firstName}-${author.lastName}`}>
              {author.firstName} {author.lastName}
              {index < content.authorsList.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
