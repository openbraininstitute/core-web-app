import { Modal } from 'antd/lib';
import { useRouter } from 'next/navigation';
import MarkdownViewer from '@/components/MarkdownViewer/MarkdownViewer';

export default async function ReadmeModal({ path }: { path: string }) {
  const router = useRouter();

  return (
    <div>
      <Modal onCancel={() => router.push('/')} open>
        <MarkdownViewer path={path} />
      </Modal>
    </div>
  );
}
