import { useEffect, useState } from 'react';
import { Modal } from 'antd/lib';
import ReactMarkdown from 'react-markdown';
import { IpynbRenderer } from 'react-ipynb-renderer';
import { Notebook } from '@/util/virtual-lab/github';
import { basePath } from '@/config';

import 'react-ipynb-renderer/dist/styles/monokai.css';

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
        `${basePath}/api/github/fetch-file?path=${encodeURIComponent(display === 'notebook' ? notebook.notebookUrl : notebook.readmeUrl)}`
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
    <Modal
      open={!!notebook && !!content}
      onCancel={() => {
        setContent(null);
        onCancel();
      }}
      footer={false}
      width="70%"
    >
      <div>
        {display === 'readme' && !!content && (
          <div className="markdown-body">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {display === 'notebook' && !!notebook && !!content && (
          <div className="h-[80vh] w-full overflow-y-scroll">
            <IpynbRenderer ipynb={JSON.parse(content)} />
          </div>
        )}
      </div>
    </Modal>
  );
}
