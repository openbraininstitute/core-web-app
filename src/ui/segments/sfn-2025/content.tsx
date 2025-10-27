import SFNAgenda from '@/ui/segments/sfn-2025/content/agenda';
import SFNDoubleButton from '@/ui/segments/sfn-2025/content/double-button';
import SFNExperience from '@/ui/segments/sfn-2025/content/experience';
import SFNJoin from '@/ui/segments/sfn-2025/content/join';
import SFNVideo from '@/ui/segments/sfn-2025/content/video';
import SFNVirtualLabs from '@/ui/segments/sfn-2025/content/virtual-labs';

export default function ContentSFN() {
  return (
    <div className="min-h-screen w-full">
      <SFNVirtualLabs />
      <SFNExperience />
      <SFNAgenda />
      <SFNVideo />
      <SFNJoin />
      <SFNDoubleButton />
    </div>
  );
}
