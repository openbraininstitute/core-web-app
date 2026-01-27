import type { RefObject } from 'react'; // Import React for RefObject

function playVideoAtTime(timeInSeconds: number, videoRef: RefObject<HTMLVideoElement>) {
  if (videoRef.current) {
    const videoElement = videoRef.current;
    videoElement.currentTime = timeInSeconds;
    videoElement.play().catch((error) => {
      throw new Error(`Failed to play video at time ${timeInSeconds}: ${error.message}`);
    });
  } else {
    throw new Error('Video reference is not set or video element is not available.');
  }
}

export default playVideoAtTime;
