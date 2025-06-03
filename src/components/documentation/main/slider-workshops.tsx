'use client';

import Link from 'next/link';
import { SingleWorkshopProps } from '../type';
import SingleWorkshopCard from './single-workshop-card';

const placeholderWorkshop: SingleWorkshopProps = {
  title: 'An introduction to Open Brain Platform',
  slug: 'introduction-to-open-brain-platform',
  date: '2024-01-15',
  description:
    'Aut modi optio sit molestias similique sed officia excepturi sit quam doloremque. Qui enim facere ab deleniti tenetur aut soluta voluptatibus et quas aliquid qui obcaecati galisum vel dolorem tempore nam consequuntur nostrum. Et suscipit omnis qui vero rerum qui voluptatem quidem cum magnam excepturi aut nisi voluptatibus. Et adipisci perspiciatis ut culpa illum cum iusto distinctio qui natus voluptate et vero nihil ut culpa quia.',
  content: null,
};

export default function SliderWorkshop() {
  return (
    <div className="w-full">
      <div className="mb-3 flex w-full flex-row items-center justify-between">
        <h1 className="text-lg font-bold text-white">Our latest workshop</h1>
        <Link
          href="/documentation/workshops"
          className="text-sm font-semibold text-white hover:underline"
        >
          See all workshops
        </Link>
      </div>

      <div className="w-full">
        <SingleWorkshopCard content={placeholderWorkshop} />
      </div>
    </div>
  );
}
