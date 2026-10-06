import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { moviesService } from '@/services/movies.service';
import { watchProgressService } from '@/services/wallet.service';
import { formatDuration } from '@/utils/helpers';
import { useTelegram } from '@/hooks/useTelegram';
import type { PlaybackData } from '@/types';

const PROGRESS_SAVE_INTERVAL = 10; // save every 10 seconds

export function WatchPage() {
  const { movieId, episodeId } = useParams<{ movieId: string; episodeId: string }>();
  const navigate = useNavigate();
  const { showBackButton, hideBackButton, haptic } = useTelegram();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch playback authorization — this also verifies purchase on backend
  const { data: playback, isLoading, error } = useQuery({
    queryKey: ['watch', movieId, episodeId],
    queryFn: () =>
      moviesService.watchEpisode(movieId!, episodeId!).then((r) => r.data as PlaybackData),
    enabled: !!(movieId && episodeId),
    retry: 0,
  });

  // Save progress mutation
  const saveProgress = useMutation({
    mutationFn: ({ position, dur }: { position: number; dur: number }) =>
      watchProgressService.updateProgress(episodeId!, Math.floor(position), Math.floor(dur)),
  });

  // Set up Telegram back button
  useEffect(() => {
    showBackButton(() => {
      saveCurrentProgress();
      navigate(-1);
    });
    return () => hideBackButton();
  }, []);

  // Initialize video when playback URL is ready
  useEffect(() => {
    if (!playback || !videoRef.current) return;

    // Select best quality available
    const best =
      playback.playbackUrls.find((u) => u.quality === '720p') ||
      playback.playbackUrls[0];

    if (best) {
      setSelectedQuality(best.quality);
      videoRef.current.src = best.url;

      // Resume from saved position
      if (playback.resumePosition > 5) {
        videoRef.current.currentTime = playback.resumePosition;
        setCurrentTime(playback.resumePosition);
      }

      videoRef.current.play().catch(() => {});
    }
  }, [playback]);

  // Periodic progress save
  useEffect(() => {
    progressIntervalRef.current = setInterval(() => {
      saveCurrentProgress();
    }, PROGRESS_SAVE_INTERVAL * 1000);

    return () => {
      clearInterval(progressIntervalRef.current);
      saveCurrentProgress();
    };
  }, [episodeId]);

  const saveCurrentProgress = useCallback(() => {
    if (videoRef.current && episodeId) {
      const pos = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 0;
      if (pos > 0 && dur > 0) {
        saveProgress.mutate({ position: pos, dur });
      }
    }
  }, [episodeId]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    haptic.light();
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    showControlsTemporarily();
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) videoRef.current.volume = vol;
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('video-container');
    if (!container) return;
    haptic.light();
    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-gold/30 border-t-gold animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">កំពុងផ្ទុកវីដេអូ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-cinema-bg flex flex-col items-center justify-center px-8">
        <span className="text-5xl mb-4">🔒</span>
        <h2 className="text-white font-bold text-lg mb-2 text-center">មិនអាចចូលមើលបានទេ</h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          {(error as Error).message || 'អ្នកមិនទាន់បានទិញរឿងនេះទេ'}
        </p>
        <button onClick={() => navigate(-1)} className="btn-gold px-8">
          ← ត្រលប់ក្រោយ
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Video container */}
      <div
        id="video-container"
        className="relative flex-1 flex items-center justify-center bg-black"
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onDurationChange={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onEnded={() => {
            setIsPlaying(false);
            saveCurrentProgress();
          }}
          onTouchStart={showControlsTemporarily}
        />

        {/* Controls overlay */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 glass-panel p-3 flex items-center gap-3">
            <button
              onClick={() => { saveCurrentProgress(); navigate(-1); }}
              className="text-white text-lg px-1"
            >
              ←
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm line-clamp-1">
                {playback?.titleKh || playback?.title}
              </p>
              <p className="text-gray-400 text-xs">ភាគ {playback?.episodeNumber}</p>
            </div>
          </div>

          {/* Center play button */}
          <div className="absolute inset-0 flex items-center justify-center" onClick={togglePlay}>
            <div className={`w-16 h-16 rounded-full bg-black/50 border-2 border-white/30 flex items-center justify-center transition-opacity duration-200 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}>
              <span className="text-white text-2xl ml-1">▶</span>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 glass-panel px-4 pb-4 pt-2">
            {/* Seek bar */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white text-xs w-10 text-right">{formatDuration(Math.floor(currentTime))}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 appearance-none bg-white/20 rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #d4af37 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) 0)`,
                }}
              />
              <span className="text-white text-xs w-10">{formatDuration(Math.floor(duration))}</span>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={togglePlay} className="text-white text-xl">
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <div className="flex items-center gap-1">
                  <span className="text-white text-sm">🔊</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Quality selector */}
                {(playback?.playbackUrls?.length ?? 0) > 1 && (
                  <select
                    value={selectedQuality}
                    onChange={(e) => {
                      const url = playback!.playbackUrls.find((u) => u.quality === e.target.value);
                      if (url && videoRef.current) {
                        const time = videoRef.current.currentTime;
                        videoRef.current.src = url.url;
                        videoRef.current.currentTime = time;
                        videoRef.current.play();
                        setSelectedQuality(e.target.value);
                      }
                    }}
                    className="bg-black/60 text-white text-xs rounded px-1 py-0.5 border border-white/20"
                  >
                    {playback?.playbackUrls.map((u) => (
                      <option key={u.quality} value={u.quality}>{u.quality}</option>
                    ))}
                  </select>
                )}
                <button onClick={toggleFullscreen} className="text-white text-lg">
                  {isFullscreen ? '⬜' : '⛶'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Episode info bottom */}
      {!isFullscreen && (
        <div className="bg-cinema-bg px-4 py-3 border-t border-cinema-border">
          <p className="text-white font-semibold text-sm">
            {playback?.titleKh || playback?.title} — ភាគ {playback?.episodeNumber}
          </p>
        </div>
      )}
    </div>
  );
}
