import ReactMarkDown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import styles from '../glossary/glossary-content.module.css';

const transformContent = (text: string) => {
  return text.replace(/\n\*\*([^*]+)\*\*: ([^\n]+)/g, '\n- **$1**: $2');
};

export default function RichContentBloc({ content }: { content: string }) {
  const processedContent = transformContent(content);

  return (
    <div className={styles.prose}>
      <ReactMarkDown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
        {processedContent}
      </ReactMarkDown>
    </div>
  );
}
