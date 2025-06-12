import ReactMarkDown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

import styles from '../glossary/glossary-content.module.css';

export default function RichContentBloc({ content }: { content: string }) {
  return (
    <div className={styles.prose}>
      <ReactMarkDown rehypePlugins={[rehypeRaw]}>{content}</ReactMarkDown>
    </div>
  );
}
