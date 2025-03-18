import { PortableText } from 'next-sanity';
import { NotebooksProps } from './type';

import styles from './style/notebook.module.css';

export default function SingleNotebook({ content }: { content: NotebooksProps }) {
  return (
    <div className="relative flex w-full flex-col items-start">
      <header className="relative flex w-full flex-row items-center justify-between text-primary-9">
        <div className="w-2/3 hyphens-auto text-4xl font-bold leading-[1.3]">{content.name}</div>
        {content.url && (
          <a
            href={content.url}
            className="border border-solid border-primary-9 bg-white px-6 py-3 text-lg transition-colors duration-300 hover:bg-primary-9 hover:text-white"
            target="_blank"
          >
            View Notebook
          </a>
        )}
      </header>

      <div className="my-6 h-px w-16 bg-neutral-3" />

      <div className={styles.readMeParagraph}>
        <PortableText value={content.readMe} />
      </div>
    </div>
  );
}
