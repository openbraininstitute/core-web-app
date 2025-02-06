import { useEffect, useState } from 'react';
import { Modal } from 'antd/lib';
import ReactMarkdown from 'react-markdown';
import { Notebook } from '@/util/virtual-lab/github';
import { basePath } from '@/config';

import 'github-markdown-css';
import { notification } from '@/api/notifications';

export default function ContentModal({
  notebook,
  onCancel,
  display,
}: {
  notebook: Notebook | null;
  display: 'notebook' | 'readme' | null;
  onCancel: () => void;
}) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFile() {
      if (!notebook || !display) return;
      const res = await fetch(
        `${basePath}/api/github/fetch-file?path=${encodeURIComponent(file.path)}`
      );

      if (!res.ok) {
        notification.error('Cannot display the contents, ensure the repository is public');
      } else {
        setContent(await res.text());
      }
    }

    fetchFile();
  }, [notebook, display]);

  return (
    <Modal open={!!notebook && !!content} onCancel={onCancel} footer={false} width="70%">
      <div>
        {display === 'readme' && (
          <div className="markdown-body">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {display === 'notebook' && !!notebook && (
          <div className="h-[80vh] w-full">
            <iframe
              title={notebook?.path}
              src={`https://nbviewer.org/github/${notebook.githubUser}/${notebook.githubRepo}/blob/${notebook.defaultBranch}/${notebook.path}`}
              width="100%"
              height="100%"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
