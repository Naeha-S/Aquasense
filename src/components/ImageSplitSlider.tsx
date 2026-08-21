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
    <div className="relative w-full flex flex-col font-mono text-[11px] select-none bg-[#030712] rounded-sm overflow-hidden border border-[#1D3D73]">
      {/* Visual Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="relative w-full aspect-4/3 sm:aspect-16/10 bg-[#071326] cursor-ew-resize overflow-hidden"
      >
        {/* Layer B (Background / Right Side) */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src={imageB}
            alt={labelB}
            className="w-full h-full object-cover pointer-events-none"
          />
          {/* Label B Badge */}
          <div className="absolute bottom-3 right-3 bg-[#071326]/90 border border-[#0284C7] text-[#F0FDFA] px-2.5 py-1 text-[10px] shadow-lg backdrop-blur-md rounded-xs">
            <div className="font-bold uppercase tracking-wider text-[#38BDF8]">{labelB}</div>
            {dateB && <div className="text-[8.5px] text-[#CADDAE]">{dateB}</div>}
            {idB && <div className="text-[7px] text-[#738CAD] max-w-[140px] truncate">{idB}</div>}
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
          <div className="absolute bottom-3 left-3 bg-[#071326]/90 border border-[#22D3EE] text-[#F0FDFA] px-2.5 py-1 text-[10px] shadow-lg backdrop-blur-md rounded-xs">
            <div className="font-bold uppercase tracking-wider text-[#22D3EE]">{labelA}</div>
            {dateA && <div className="text-[8.5px] text-[#CADDAE]">{dateA}</div>}
            {idA && <div className="text-[7px] text-[#738CAD] max-w-[140px] truncate">{idA}</div>}
          </div>
        </div>

        {/* The Split Divider Line & Draggable Handle */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-[#22D3EE] pointer-events-none z-20 shadow-[0_0_10px_#22D3EE]"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#071326] border-2 border-[#22D3EE] flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.6)]">
            <ChevronsLeftRight className="w-4 h-4 text-[#22D3EE]" />
          </div>
        </div>

        {/* Top HUD Telemetry Indicator */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#071326]/85 border border-[#1D3D73] px-3 py-0.5 text-[8.5px] text-[#38BDF8] backdrop-blur-sm rounded-xs pointer-events-none">
          SWIPE COMPARISON: {sliderPosition.toFixed(0)}%
        </div>
      </div>

      {/* Control Bar Below Image */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#071326] border-t border-[#1D3D73] text-[10px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            className={`px-2.5 py-1 border flex items-center gap-1.5 font-bold transition-all rounded-xs ${
              isPlaying
                ? 'bg-[#22D3EE] text-[#030712] border-[#22D3EE] shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                : 'bg-[#0C1E3D] text-[#22D3EE] border-[#1D3D73] hover:border-[#22D3EE]'
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
            className="px-2 py-1 bg-[#0C1E3D] text-[#CADDAE] border border-[#1D3D73] hover:border-[#22D3EE] flex items-center gap-1 transition-all rounded-xs"
            title="Reset to 50/50"
          >
            <RotateCcw className="w-3 h-3" /> 50/50
          </button>
        </div>

        {/* Position Slider Input */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[#738CAD] uppercase font-bold">Split Ratio:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPosition}
            onChange={(e) => {
              setIsPlaying(false);
              setSliderPosition(parseFloat(e.target.value));
            }}
            className="w-24 sm:w-36 accent-[#22D3EE] h-1.5 bg-[#0C1E3D] rounded-xs cursor-pointer"
          />
          <span className="text-[10px] font-bold text-[#22D3EE] w-7 text-right">
            {sliderPosition.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
