import { useEffect, useMemo, useState } from 'react';
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

  const renderContent = useMemo(() => {
    if (!content) return;
    if (file?.type === 'text') return content;

    try {
      return JSON.parse(content);
    } catch {
      return 'Cannot display the contents';
    }
  }, [content, file]);

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
    <Modal open={!!file && !!renderContent} onCancel={onCancel} footer={false} width="70%">
      <div>
        {file?.type === 'text' && (
          <div className="markdown-body">
            <ReactMarkdown>{renderContent}</ReactMarkdown>
          </div>
        )}

        {file?.type === 'json' && (
          <ReactJson
            src={renderContent}
            displayDataTypes={false}
            indentWidth={2}
            collapseStringsAfterLength={64}
          />
        )}
      </div>
    </Modal>
  );
}
