import { useRef, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
} from "lucide-react";
import { playlist } from "@/config/videos";

const VideoPlayer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState<Record<number, boolean>>({});
  const [muted, setMuted] = useState(true);
  const [showPlay, setShowPlay] = useState<number | null>(null);
  const playTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Snap scroll handler
  const scrollToIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(playlist.length - 1, index));
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: clamped * window.innerHeight, behavior: "smooth" });
  }, []);

  // Detect which video is in view via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setCurrentIndex(i);
            video.currentTime = 0;
            video.play().catch(() => {});
            setPlaying((p) => ({ ...p, [i]: true }));
          } else {
            video.pause();
            setPlaying((p) => ({ ...p, [i]: false }));
          }
        },
        { threshold: 0.6 }
      );
      obs.observe(video);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown" || e.code === "KeyJ") {
        e.preventDefault();
        scrollToIndex(currentIndex + 1);
      }
      if (e.code === "ArrowUp" || e.code === "KeyK") {
        e.preventDefault();
        scrollToIndex(currentIndex - 1);
      }
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay(currentIndex);
      }
      if (e.code === "KeyM") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, scrollToIndex]);

  // Apply muted state
  useEffect(() => {
    videoRefs.current.forEach((v) => {
      if (v) v.muted = muted;
    });
  }, [muted]);

  // Auto-advance on end
  useEffect(() => {
    const v = videoRefs.current[currentIndex];
    if (!v) return;
    const onEnd = () => scrollToIndex(currentIndex + 1);
    v.addEventListener("ended", onEnd);
    return () => v.removeEventListener("ended", onEnd);
  }, [currentIndex, scrollToIndex]);

  const togglePlay = (index: number) => {
    const v = videoRefs.current[index];
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying((p) => ({ ...p, [index]: true }));
      setShowPlay(null);
    } else {
      v.pause();
      setPlaying((p) => ({ ...p, [index]: false }));
      setShowPlay(index);
      clearTimeout(playTimeout.current);
      playTimeout.current = setTimeout(() => setShowPlay(null), 800);
    }
  };

  return (
    <div className="relative h-full w-full bg-background">
      {/* Scrollable feed */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {playlist.map((item, i) => (
          <div
            key={i}
            className="h-screen w-full snap-start snap-always relative flex items-center justify-center"
            onClick={() => togglePlay(i)}
          >
            {/* Video — object-contain handles both portrait & landscape */}
            <video
              ref={(el) => { videoRefs.current[i] = el; }}
              src={item.src}
              muted={muted}
              loop={false}
              playsInline
              preload="auto"
              className="h-full w-full object-contain bg-background"
            />

            {/* Paused overlay icon */}
            {(showPlay === i || !playing[i]) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-foreground/10 backdrop-blur-md flex items-center justify-center animate-pulse">
                  {playing[i] ? (
                    <Pause size={32} className="text-foreground" />
                  ) : (
                    <Play size={32} className="text-foreground ml-1" />
                  )}
                </div>
              </div>
            )}

            {/* Bottom info */}
            <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 pointer-events-none"
              style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}
            >
              <p className="text-foreground font-semibold text-sm sm:text-base">{item.title}</p>
              <p className="text-foreground/50 text-xs mt-1">
                {i + 1} / {playlist.length}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Right side action buttons */}
      <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-10">
        {/* Up */}
        <button
          onClick={() => scrollToIndex(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-foreground/10 backdrop-blur-md flex items-center justify-center hover:bg-foreground/20 transition-colors disabled:opacity-30"
        >
          <ChevronUp size={22} className="text-foreground" />
        </button>

        {/* Mute toggle */}
        <button
          onClick={() => setMuted((m) => !m)}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-foreground/10 backdrop-blur-md flex items-center justify-center hover:bg-foreground/20 transition-colors"
        >
          {muted ? (
            <VolumeX size={20} className="text-foreground" />
          ) : (
            <Volume2 size={20} className="text-foreground" />
          )}
        </button>

        {/* Down */}
        <button
          onClick={() => scrollToIndex(currentIndex + 1)}
          disabled={currentIndex === playlist.length - 1}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-foreground/10 backdrop-blur-md flex items-center justify-center hover:bg-foreground/20 transition-colors disabled:opacity-30"
        >
          <ChevronDown size={22} className="text-foreground" />
        </button>
      </div>

      {/* Video counter top-right */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <span className="text-foreground/70 text-xs sm:text-sm font-medium bg-foreground/5 backdrop-blur-md px-3 py-1 rounded-full">
          {currentIndex + 1} / {playlist.length}
        </span>
      </div>
    </div>
  );
};

export default VideoPlayer;
