import { useEffect, useState } from 'react';
import { Modal } from 'antd/lib';
import ReactMarkdown from 'react-markdown';
import dynamic from 'next/dynamic';

import { basePath } from '@/config';

import 'react-ipynb-renderer/dist/styles/monokai.css';

import 'github-markdown-css';
import { Notebook } from '@/util/virtual-lab/types';
import { useAppNotification } from '@/components/notification';

const IpynbRenderer = dynamic(
  () => import('react-ipynb-renderer').then((mod) => mod.IpynbRenderer),
  { ssr: false }
);

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
  const notification = useAppNotification();
  useEffect(() => {
    const controller = new AbortController();

    async function fetchFile() {
      if (!notebook || !display) return;

      try {
        const res = await fetch(
          `${basePath}/api/github/fetch-file?path=${encodeURIComponent(display === 'notebook' ? notebook.notebookUrl : notebook.readmeUrl)}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          notification.error({
            message: 'Cannot display the contents, ensure the repository is public',
            placement: 'topRight',
          });
        } else {
          setContent(await res.text());
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          notification.error({
            message: 'An error occurred while fetching the file',
            placement: 'topRight',
          });
        }
      }
    }

    fetchFile();

    return () => controller.abort();
  }, [notebook, display]); // eslint-disable-line react-hooks/exhaustive-deps

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
