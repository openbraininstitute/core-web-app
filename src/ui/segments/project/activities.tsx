import { Card, CardHeader, CardContent } from '@/ui/molecules/card';

export function ProjectActivities() {
  return (
    <Card className="shadow-xs">
      <CardHeader className="text-primary-9 font-bold">Recent activities</CardHeader>
      <CardContent>
        <Card borderless shadowless className="flex items-center justify-center py-10">
          <p className="text-neutral-4">You don’t have any activity yet</p>
        </Card>
      </CardContent>
    </Card>
  );
}
