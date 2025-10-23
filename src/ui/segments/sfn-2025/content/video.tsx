'use client';

import { PlayCircleOutlined, SoundFilled, SoundOutlined } from '@ant-design/icons';
import { useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

export default function SFNVideo() {
  const ref = useRef(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(true);
  const isInView = useInView(ref, {
    amount: 0.8,
    once: false,
  });

  useEffect(() => {
    if (videoRef.current) {
      if (isInView) {
        videoRef.current
          .play()
          .then(() => {
            setIsPaused(false);
          })
          .catch((_error) => {
            setIsPaused(true);
            // Video might not play due to browser autoplay policies
          });
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  }, [isInView]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current
          .play()
          .then(() => {
            setIsPaused(false);
          })
          .catch((_error) => {
            setIsPaused(true);
          });
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  return (
    <div ref={ref} className="relative h-full w-full px-8 py-12 md:px-[8vw] md:py-[15vh]">
      <video
        ref={videoRef}
        muted={isMuted}
        loop
        playsInline
        className="h-full w-full cursor-pointer object-cover"
        onClick={handleVideoClick}
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

      {/* Play/Pause Button - Only show when paused */}
      {isPaused && (
        <button
          type="button"
          onClick={handleVideoClick}
          className="bg-opacity-70 hover:bg-opacity-90 absolute top-1/2 left-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black text-white transition-all"
          aria-label="Play video"
        >
          <PlayCircleOutlined className="text-3xl" />
        </button>
      )}

      {/* Mute Button */}
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
