import { ResearchLogView } from '@/features/research-logs/research-log-view';

export default async function ResearchLogPage({ params }: { params: Promise<{ logId: string }> }) {
  const { logId } = await params;
  return <ResearchLogView id={logId} />;
}
