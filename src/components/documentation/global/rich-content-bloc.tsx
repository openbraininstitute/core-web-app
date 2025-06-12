import ReactMarkDown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

export default function RichContentBloc({ content }: { content: string }) {
  return (
    <div className="prose">
      <ReactMarkDown rehypePlugins={[rehypeRaw]}>{content}</ReactMarkDown>
    </div>
  );
}
