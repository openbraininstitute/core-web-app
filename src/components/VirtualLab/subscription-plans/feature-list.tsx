import kebabCase from 'lodash/kebabCase';
import { CheckCircleFilled } from '@ant-design/icons';

type Props = {
  features: Array<{
    text: string;
    included: 'full' | 'partial';
  }>;
};

export default function FeatureList({ features }: Props) {
  return (
    <ul className="space-y-3">
      {features.map((feature) => (
        <li key={kebabCase(feature.text)} className="flex items-center text-gray-700">
          <span className={`text-sm ${feature.included === 'partial' ? 'text-green-600' : ''}`}>
            {feature.text}
          </span>
          <div className="ml-auto">
            {feature.included === 'partial' && (
              <span className="mr-2 text-sm text-green-600">Partial build</span>
            )}
            <CheckCircleFilled className="h-5 w-5 text-green-500" />
          </div>
        </li>
      ))}
    </ul>
  );
}
