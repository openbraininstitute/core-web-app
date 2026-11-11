import type { RefObject } from 'react';

/** The slice of HTMLVideoElement the tutorial steps use; YouTubePlayer implements it too. */
export type VideoHandle = {
  currentTime: number;
  play: () => Promise<void> | void;
};

function playVideoAtTime(timeInSeconds: number, videoRef: RefObject<VideoHandle>) {
  if (videoRef.current) {
    const videoElement = videoRef.current;
    videoElement.currentTime = timeInSeconds;
    Promise.resolve(videoElement.play()).catch((error) => {
      throw new Error(`Failed to play video at time ${timeInSeconds}: ${error.message}`);
    });
  } else {
    throw new Error('Video reference is not set or video element is not available.');
  }
}

export default playVideoAtTime;
