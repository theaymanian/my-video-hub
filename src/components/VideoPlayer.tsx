import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize } from "lucide-react";
import { playlist } from "@/config/videos";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const VideoPlayer = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const video = playlist[currentIndex];

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const goTo = useCallback((index: number) => {
    const next = (index + playlist.length) % playlist.length;
    setCurrentIndex(next);
    setPlaying(true);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    if (playing) v.play().catch(() => {});
  }, [currentIndex]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onMeta = () => setDuration(v.duration);
    const onEnd = () => goTo(currentIndex + 1);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended", onEnd);
    };
  }, [currentIndex, goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.code === "ArrowRight") goTo(currentIndex + 1);
      if (e.code === "ArrowLeft") goTo(currentIndex - 1);
      if (e.code === "ArrowUp") { e.preventDefault(); if (videoRef.current) videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1); }
      if (e.code === "ArrowDown") { e.preventDefault(); if (videoRef.current) videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1); }
      if (e.code === "KeyM") setMuted(m => { if (videoRef.current) videoRef.current.muted = !m; return !m; });
      if (e.code === "KeyF") videoRef.current?.requestFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, togglePlay, goTo]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !videoRef.current) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = ratio * duration;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (playing) setShowControls(false); }, 2500);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex h-screen w-screen">
      {/* Sidebar playlist */}
      <aside className="w-72 shrink-0 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground tracking-wide uppercase">Playlist</h2>
          <p className="text-xs text-muted-foreground mt-1">{playlist.length} videos</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {playlist.map((v, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                i === currentIndex
                  ? "bg-accent/10 text-accent border-l-2 border-accent"
                  : "text-secondary-foreground hover:bg-secondary border-l-2 border-transparent"
              }`}
            >
              <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}</span>
              <span className="text-sm truncate">{v.title}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Video area */}
      <main
        className="flex-1 relative flex items-center justify-center bg-background cursor-pointer select-none"
        onMouseMove={handleMouseMove}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={video.src}
          muted={muted}
          className="max-h-full max-w-full"
        />

        {/* Overlay controls */}
        <div
          className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ background: "linear-gradient(transparent, hsl(var(--player-controls)))" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="mx-4 h-1 bg-secondary rounded-full cursor-pointer group relative"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-accent rounded-full relative transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <button onClick={() => goTo(currentIndex - 1)} className="p-2 rounded-lg hover:bg-[hsl(var(--player-hover))] transition-colors">
                <SkipBack size={18} />
              </button>
              <button onClick={togglePlay} className="p-2 rounded-lg hover:bg-[hsl(var(--player-hover))] transition-colors">
                {playing ? <Pause size={22} /> : <Play size={22} />}
              </button>
              <button onClick={() => goTo(currentIndex + 1)} className="p-2 rounded-lg hover:bg-[hsl(var(--player-hover))] transition-colors">
                <SkipForward size={18} />
              </button>
              <button onClick={() => { setMuted(m => { if (videoRef.current) videoRef.current.muted = !m; return !m; }); }} className="p-2 rounded-lg hover:bg-[hsl(var(--player-hover))] transition-colors">
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <span className="text-xs text-muted-foreground ml-2 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground truncate max-w-48">{video.title}</span>
              <button onClick={() => videoRef.current?.requestFullscreen()} className="p-2 rounded-lg hover:bg-[hsl(var(--player-hover))] transition-colors">
                <Maximize size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Big play button when paused */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-accent/20 backdrop-blur-sm flex items-center justify-center">
              <Play size={36} className="text-accent ml-1" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default VideoPlayer;
