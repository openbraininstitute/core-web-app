import { CircuitSchemaProps } from '../type';
import HeaderDetailView from './HeaderDetailView';
import Visualiser from './visualisation/Visualiser';

export default function MainDetailViewCore({ content }: { content: CircuitSchemaProps }) {
  return (
    <div className="relative flex w-full flex-col text-primary-9">
      <HeaderDetailView content={content} />
      <Visualiser content={content} />
    </div>
  );
}
