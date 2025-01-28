import { useEffect, useState } from 'react';
import { Modal } from 'antd/lib';
import ReactMarkdown from 'react-markdown';
import 'github-markdown-css';
import ReactJson from 'react-json-view';

export default function MarkdownModal({
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
        setContent('Cannot display the Readme');
      } else {
        setContent(await res.text());
      }
    }

    fetchFile();
  }, [file]);

  if (!file || !content) return;

  return (
    <Modal open={!!file && !!content} onCancel={onCancel} footer={false} width="70%">
      <div>
        {file?.type === 'text' && (
          <div className="markdown-body">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {file?.type === 'json' && (
          <ReactJson
            src={JSON.parse(content)}
            displayDataTypes={false}
            indentWidth={2}
            collapseStringsAfterLength={64}
          />
        )}
      </div>
    </Modal>
  );
}
