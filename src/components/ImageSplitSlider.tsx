import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronsLeftRight, Play, Pause, RotateCcw } from 'lucide-react';

interface ImageSplitSliderProps {
  imageA: string;
  imageB: string;
  labelA?: string;
  labelB?: string;
  dateA?: string;
  dateB?: string;
  idA?: string;
  idB?: string;
  aspectRatio?: string;
}

export function ImageSplitSlider({
  imageA,
  imageB,
  labelA = 'Year A (T0)',
  labelB = 'Year B (T1)',
  dateA,
  dateB,
  idA,
  idB,
}: ImageSplitSliderProps) {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playDirectionRef = useRef<'forward' | 'backward'>('forward');
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setIsPlaying(false);
    handleMove(e.clientX);
  }, [handleMove]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    setIsPlaying(false);
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    };

    const handleWindowMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      handleMove(e.touches[0].clientX);
    };

    const handleWindowTouchEnd = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
      window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
      window.addEventListener('touchend', handleWindowTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
    };
  }, [isDragging, handleMove]);

  // Auto-swipe / play animation
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();
    const speed = 0.04; // percent per ms

    const animate = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      setSliderPosition((prev) => {
        let next = prev;
        if (playDirectionRef.current === 'forward') {
          next += speed * delta;
          if (next >= 95) {
            playDirectionRef.current = 'backward';
            next = 95;
          }
        } else {
          next -= speed * delta;
          if (next <= 5) {
            playDirectionRef.current = 'forward';
            next = 5;
          }
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      setSliderPosition((prev) => Math.min(100, prev + 5));
    } else if (e.key === 'Home') {
      setSliderPosition(0);
    } else if (e.key === 'End') {
      setSliderPosition(100);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center select-none">
      {/* Slider Container */}
      <div
        ref={containerRef}
        id="image-split-slider"
        role="slider"
        aria-valuenow={Math.round(sliderPosition)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Satellite Imagery Temporal Comparison Slider"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="w-full h-full relative overflow-hidden cursor-ew-resize focus:outline-none focus:ring-1 focus:ring-white/40 group"
      >
        {/* Layer B (Background / Full Year B) */}
        <div className="absolute inset-0 w-full h-full bg-[#0a0a0a]">
          <img
            src={imageB}
            alt={labelB}
            crossOrigin="anonymous"
            className="w-full h-full object-cover pointer-events-none"
            loading="eager"
          />
          {/* Label for Year B */}
          <div className="absolute top-2 right-2 bg-black/85 text-white px-2.5 py-1 text-[10px] font-mono border border-white/20 backdrop-blur-sm z-10 pointer-events-none flex flex-col items-end">
            <span className="font-bold text-amber-300">{labelB}</span>
            {dateB && <span className="opacity-75 text-[9px]">{dateB}</span>}
          </div>
        </div>

        {/* Layer A (Clipped Overlay / Year A) */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none will-change-[clip-path]"
          style={{
            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
          }}
        >
          <img
            src={imageA}
            alt={labelA}
            crossOrigin="anonymous"
            className="w-full h-full object-cover pointer-events-none"
            loading="eager"
          />
          {/* Label for Year A */}
          <div className="absolute top-2 left-2 bg-black/85 text-white px-2.5 py-1 text-[10px] font-mono border border-white/20 backdrop-blur-sm z-10 pointer-events-none flex flex-col items-start">
            <span className="font-bold text-cyan-300">{labelA}</span>
            {dateA && <span className="opacity-75 text-[9px]">{dateA}</span>}
          </div>
        </div>

        {/* Divider Line & Grab Handle */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)] pointer-events-none z-20 will-change-transform"
          style={{
            left: `${sliderPosition}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {/* Center Grab Button / Thumb */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#141414] border-2 border-white text-white flex items-center justify-center shadow-lg transition-transform ${
              isDragging ? 'scale-110 bg-black' : 'group-hover:scale-105'
            }`}
          >
            <ChevronsLeftRight className="w-4 h-4" />
          </div>
        </div>

        {/* Touch/Mouse hint on hover */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/75 text-white/90 text-[9px] font-mono px-2 py-0.5 border border-white/10 pointer-events-none backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
          Drag to swipe • {Math.round(sliderPosition)}%
        </div>
      </div>

      {/* Preset and Playback Bar */}
      <div className="w-full bg-[#141414] border-t border-white/10 px-3 py-1.5 flex items-center justify-between text-white font-mono text-[9px] flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Auto Sweep' : 'Auto Sweep Animation'}
            className="px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1 text-[9px]"
          >
            {isPlaying ? <Pause className="w-2.5 h-2.5 text-amber-400" /> : <Play className="w-2.5 h-2.5 text-green-400" />}
            {isPlaying ? 'PAUSE' : 'AUTO SWEEP'}
          </button>
          <button
            type="button"
            onClick={() => { setIsPlaying(false); setSliderPosition(50); }}
            title="Reset to 50% split"
            className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1 text-[9px]"
          >
            <RotateCcw className="w-2.5 h-2.5" /> 50%
          </button>
        </div>

        {/* Snap Buttons */}
        <div className="flex items-center gap-1">
          <span className="opacity-50 text-[8px] mr-1 hidden sm:inline">SNAP:</span>
          {[0, 25, 50, 75, 100].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => { setIsPlaying(false); setSliderPosition(val); }}
              className={`px-1.5 py-0.5 border text-[8px] transition-colors ${
                Math.round(sliderPosition) === val
                  ? 'bg-white text-black font-bold border-white'
                  : 'bg-white/5 border-white/15 hover:bg-white/15'
              }`}
            >
              {val}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
