import SubtitleBar from '../SubtitleBar';

export default function OverviewSection() {
  return (
    <div className="relative flex w-full flex-col">
      <SubtitleBar title="Cell statistics" />
      <SubtitleBar title="Network statistics" />
    </div>
  );
}
