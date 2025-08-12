import { FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';

interface FullScreenProps {
  isFullScreen: boolean;
  onToggle: () => void;
}

export default function FullScreen({ isFullScreen, onToggle }: FullScreenProps) {
  return (
    <div className="absolute top-4 left-4 z-50 cursor-pointer text-white">
      {isFullScreen ? (
        <FullscreenExitOutlined className="h-5 w-5 text-xl" onClick={onToggle} />
      ) : (
        <FullscreenOutlined className="h-5 w-5 text-xl" onClick={onToggle} />
      )}
    </div>
  );
}
