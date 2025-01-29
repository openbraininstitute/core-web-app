import { useEffect, useState } from 'react';
import { Modal } from 'antd/lib';
import ReactMarkdown from 'react-markdown';
import 'github-markdown-css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

export default function ContentModal({
  file,
  onCancel,
}: {
  file: { path: string; type: 'json' | 'text' } | null;
  onCancel: () => void;
}) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFile() {
      if (!file) return;
      const res = await fetch(`/api/github/fetchFile?path=${encodeURIComponent(file.path)}`);

      if (!res.ok) {
        setContent('Cannot display the contents');
      } else {
        setContent(await res.text());
      }
    }

    fetchFile();
  }, [file]);

  return (
    <Modal open={!!file && !!content} onCancel={onCancel} footer={false} width="70%">
      <div>
        {file?.type === 'text' && (
          <div className="markdown-body">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {file?.type === 'json' && content && (
          <SyntaxHighlighter language="json">{content}</SyntaxHighlighter>
        )}
      </div>
    </Modal>
  );
}
