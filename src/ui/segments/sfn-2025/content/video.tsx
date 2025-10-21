export default function SFNVideo() {
  return (
    <div className="relative h-full w-full px-8 py-[15vh]">
      <video
        autoPlay
        muted
        loop
        playsInline
        src="https://player.vimeo.com/progressive_redirect/playback/1129196270/rendition/1080p/file.mp4?loc=external&log_user=0&signature=b8ed690f71165397f6349edadb8b953ff25ccf7235228c949a6a6c0420b0d4bf"
      />
    </div>
  );
}
