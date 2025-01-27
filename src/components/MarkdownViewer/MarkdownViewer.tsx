import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchFile } from '@/util/virtual-lab/github';

export default async function MarkdownViewer({ path }: { path: string }) {
  const markdownContent = await fetchFile(path);

  return (
    <div>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownContent}</ReactMarkdown>
    </div>
  );
}
