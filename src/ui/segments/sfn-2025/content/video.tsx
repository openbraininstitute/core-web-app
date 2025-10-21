'use client';

import { SoundFilled, SoundOutlined } from '@ant-design/icons';
import { useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

export default function SFNVideo() {
  const ref = useRef(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const isInView = useInView(ref, {
    amount: 0.8,
    once: false,
  });

  useEffect(() => {
    if (videoRef.current) {
      if (isInView) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isInView]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div ref={ref} className="relative h-full w-full px-8 py-[15vh]">
      <video
        ref={videoRef}
        muted={isMuted}
        loop
        playsInline
        className="h-full w-full object-cover"
        src="https://player.vimeo.com/progressive_redirect/playback/1129196270/rendition/1080p/file.mp4?loc=external&log_user=0&signature=b8ed690f71165397f6349edadb8b953ff25ccf7235228c949a6a6c0420b0d4bf"
      >
        <track
          kind="captions"
          src="/captions/sfn-video-captions.vtt"
          srcLang="en"
          label="English captions"
          default
        />
      </video>

      <button
        type="button"
        onClick={toggleMute}
        className={cn(
          'bg-opacity-50 hover:bg-opacity-70 absolute top-52 right-16 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white transition-all',
          isMuted ? 'Unmute video' : 'Mute video'
        )}
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
      >
        {isMuted ? <SoundOutlined className="text-xl" /> : <SoundFilled className="text-xl" />}
      </button>
    </div>
  );
}
