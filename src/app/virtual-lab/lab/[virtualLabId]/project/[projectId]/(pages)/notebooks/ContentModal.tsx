import { useEffect, useState } from 'react';
import { Modal } from 'antd/lib';
import ReactMarkdown from 'react-markdown';
import { basePath, notebookRepository } from '@/config';

import 'github-markdown-css';

export default function ContentModal({
  file,
  onCancel,
}: {
  file: { path: string; type: 'notebook' | 'text' } | null;
  onCancel: () => void;
}) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFile() {
      if (!file) return;
      const res = await fetch(
        `${basePath}/api/github/fetchFile?path=${encodeURIComponent(file.path)}`
      );

      if (!res.ok) {
        setContent('Cannot display the contents, ensure the repository is public');
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

        {file?.type === 'notebook' && content && (
          <div className="h-[80vh] w-full">
            <iframe
              title={file.path}
              src={`https://nbviewer.org/github/${notebookRepository.repository}/${notebookRepository.user}/${encodeURIComponent(file.path)}`}
              width="100%"
              height="100%"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
