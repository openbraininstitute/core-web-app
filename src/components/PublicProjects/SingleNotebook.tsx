import { PortableText } from 'next-sanity';
import { NotebooksProps } from './type';

import styles from './style/notebook.module.css';

export default function SingleNotebook({
  content,
  index,
}: {
  content: NotebooksProps;
  index: number;
}) {
  return (
    <>
      {index !== 0 && <div className="bg-neutral-2 my-1 h-px w-full" />}
      <div className="relative flex w-full flex-col items-start">
        <header className="text-primary-9 relative flex w-full flex-row items-center justify-between">
          <div className="flex w-full flex-col">
            <div className="text-sm font-normal">{index + 1}</div>
            <div className="w-2/3 text-3xl leading-[1.3] font-bold hyphens-auto">
              {content.name}
            </div>
          </div>
          {content.url && (
            <a
              href={content.url}
              className="border-primary-9 hover:bg-primary-9 border border-solid bg-white px-6 py-3 text-lg whitespace-nowrap transition-colors duration-300 hover:text-white"
              target="_blank"
            >
              View Notebook
            </a>
          )}
        </header>

        <div className="bg-neutral-3 my-3 h-px w-12" />

        <div className={styles.readMeParagraph}>
          <PortableText value={content.readMe} />
        </div>
      </div>
    </>
  );
}
