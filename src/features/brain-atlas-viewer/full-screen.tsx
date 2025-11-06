import { FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';

interface FullScreenProps {
  isFullScreen: boolean;
  onToggle: () => void;
}

export function FullScreen({ isFullScreen, onToggle }: FullScreenProps) {
  return (
    <div className="hover:text-primary-2 absolute top-4 left-4 z-50 h-8 w-7 cursor-pointer rounded-md p-1 text-white hover:bg-black/10">
      {isFullScreen ? (
        <FullscreenExitOutlined className="text-xl" onClick={onToggle} />
      ) : (
        <FullscreenOutlined className="text-xl" onClick={onToggle} />
      )}
    </div>
  );
}

export default FullScreen;
