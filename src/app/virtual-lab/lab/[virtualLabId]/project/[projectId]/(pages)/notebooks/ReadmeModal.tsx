import { Modal } from 'antd/lib';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'github-markdown-css';
import 'highlight.js/styles/github.css'; // Syntax highlighting theme

import { useEffect, useState } from 'react';

export default function ReadmeModal({
  dir,
  onCancel,
}: {
  dir: string | null;
  onCancel: () => void;
}) {
  const [readme, setReadme] = useState<string | null>(null);

  console.log(readme);

  useEffect(() => {
    async function fetchFile() {
      if (!dir) return;
      const res = await fetch(
        `/api/github/fetchFile?path=${encodeURIComponent(dir + '/README.md')}`
      );

      if (!res.ok) {
        setReadme('Cannot display the Readme');
      } else {
        setReadme(await res.text());
      }
    }
    fetchFile();
  }, [dir, setReadme]);

  return (
    <Modal open={!!dir} onCancel={onCancel} footer={false} width={'50%'}>
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {readme}
        </ReactMarkdown>
      </div>
    </Modal>
  );
}
