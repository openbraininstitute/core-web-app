import { ImageIcon } from '@/components/icons/image-states';
import { Card, CardContent } from '@/ui/molecules/card';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

function CardSkeleton() {
  return (
    <Card
      className={cn(
        'w-full bg-white border-none flex-1 p-2 gap-3',
        'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]'
      )}
    >
      <Skeleton className="h-10 w-2/4 rounded-full bg-background" />
      <CardContent className="relative h-41.75 w-auto px-0">
        <Skeleton className="w-full h-full bg-background rounded-md flex items-center justify-center">
          <ImageIcon className="size-10 text-gray-200" />
        </Skeleton>
      </CardContent>
    </Card>
  );
}

export default function Loading() {
  return (
    <section className="grid grid-cols-3 gap-2 pr-2 mb-10">
      {Array.from({ length: 9 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </section>
  );
}
