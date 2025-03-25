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
      {index !== 0 && <div className="my-1 h-px w-full bg-neutral-2" />}
      <div className="relative flex w-full flex-col items-start">
        <header className="relative flex w-full flex-row items-center justify-between text-primary-9">
          <div className="flex w-full flex-col">
            <div className="text-sm font-normal">{index + 1}</div>
            <div className="w-2/3 hyphens-auto text-3xl font-bold leading-[1.3]">
              {content.name}
            </div>
          </div>
          {content.url && (
            <a
              href={content.url}
              className="whitespace-nowrap border border-solid border-primary-9 bg-white px-6 py-3 text-lg transition-colors duration-300 hover:bg-primary-9 hover:text-white"
              target="_blank"
            >
              View Notebook
            </a>
          )}
        </header>

        <div className="my-3 h-px w-12 bg-neutral-3" />

        <div className={styles.readMeParagraph}>
          <PortableText value={content.readMe} />
        </div>
      </div>
    </>
  );
}
