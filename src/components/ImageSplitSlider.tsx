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
            next = 95;
            playDirectionRef.current = 'backward';
          }
        } else {
          next -= speed * delta;
          if (next <= 5) {
            next = 5;
            playDirectionRef.current = 'forward';
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

  return (
    <div className="relative w-full flex flex-col font-mono text-[11px] select-none bg-[#050810] rounded-xs overflow-hidden border border-[#334155]">
      {/* Visual Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="relative w-full aspect-4/3 sm:aspect-16/10 bg-[#070B14] cursor-ew-resize overflow-hidden"
      >
        {/* Layer B (Background / Right Side) */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src={imageB}
            alt={labelB}
            className="w-full h-full object-cover pointer-events-none"
          />
          {/* Label B Badge */}
          <div className="absolute bottom-2.5 right-2.5 bg-[#0E1726]/90 border border-[#38BDF8]/60 text-[#F1F5F9] px-2 py-0.5 text-[9.5px] shadow-md backdrop-blur-md rounded-xs">
            <div className="font-semibold uppercase tracking-wider text-[#38BDF8]">{labelB}</div>
            {dateB && <div className="text-[8px] text-[#94A3B8]">{dateB}</div>}
            {idB && <div className="text-[7px] text-[#64748B] max-w-[140px] truncate">{idB}</div>}
          </div>
        </div>

        {/* Layer A (Foreground / Left Side with Dynamic Clip-Path) */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden"
          style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
        >
          <img
            src={imageA}
            alt={labelA}
            className="w-full h-full object-cover pointer-events-none"
          />
          {/* Label A Badge */}
          <div className="absolute bottom-2.5 left-2.5 bg-[#0E1726]/90 border border-[#2DD4BF]/60 text-[#F1F5F9] px-2 py-0.5 text-[9.5px] shadow-md backdrop-blur-md rounded-xs">
            <div className="font-semibold uppercase tracking-wider text-[#2DD4BF]">{labelA}</div>
            {dateA && <div className="text-[8px] text-[#94A3B8]">{dateA}</div>}
            {idA && <div className="text-[7px] text-[#64748B] max-w-[140px] truncate">{idA}</div>}
          </div>
        </div>

        {/* The Split Divider Line & Draggable Handle */}
        <div
          className="absolute top-0 bottom-0 w-[1.5px] bg-[#F1F5F9] pointer-events-none z-20 shadow-md"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#0E1726] border border-[#2DD4BF] flex items-center justify-center shadow-md">
            <ChevronsLeftRight className="w-3.5 h-3.5 text-[#2DD4BF]" />
          </div>
        </div>

        {/* Top Telemetry Indicator */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#0E1726]/85 border border-[#334155] px-2.5 py-0.5 text-[8px] text-[#CBD5E1] backdrop-blur-sm rounded-xs pointer-events-none font-medium">
          SPLIT VIEW: {sliderPosition.toFixed(0)}%
        </div>
      </div>

      {/* Control Bar Below Image */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0A0F1D] border-t border-[#1E293B] text-[9.5px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            className={`px-2 py-0.5 border flex items-center gap-1.5 font-medium transition-all rounded-xs cursor-pointer ${
              isPlaying
                ? 'bg-[#2DD4BF] text-[#042F2E] border-[#2DD4BF]'
                : 'bg-[#131F37] text-[#2DD4BF] border-[#334155] hover:border-[#2DD4BF]'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3" /> Auto-Swipe Running
              </>
            ) : (
              <>
                <Play className="w-3 h-3" /> Auto-Swipe
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setSliderPosition(50);
            }}
            className="px-2 py-0.5 bg-[#131F37] text-[#94A3B8] border border-[#334155] hover:text-[#F1F5F9] hover:border-[#94A3B8] flex items-center gap-1 transition-all rounded-xs cursor-pointer"
            title="Reset to 50/50"
          >
            <RotateCcw className="w-3 h-3" /> 50/50
          </button>
        </div>

        {/* Position Slider Input */}
        <div className="flex items-center gap-2">
          <span className="text-[8.5px] text-[#94A3B8] uppercase">Ratio:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPosition}
            onChange={(e) => {
              setIsPlaying(false);
              setSliderPosition(parseFloat(e.target.value));
            }}
            className="w-24 sm:w-32 accent-[#2DD4BF] h-1 bg-[#1E293B] rounded-xs cursor-pointer"
          />
          <span className="text-[9.5px] font-semibold text-[#F1F5F9] w-6 text-right">
            {sliderPosition.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
