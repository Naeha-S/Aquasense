import React, { useState, useRef, useEffect } from 'react';
import { Palette, ChevronDown, Check, Sparkles } from 'lucide-react';
import { COLOR_RAMPS, ColorRampId, ColorRampDefinition } from '../utils/colorRamps';

interface ColorRampSelectorProps {
  selectedRamp: ColorRampId;
  onChange: (rampId: ColorRampId) => void;
  disabled?: boolean;
}

export function ColorRampSelector({
  selectedRamp,
  onChange,
  disabled = false,
}: ColorRampSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentRamp: ColorRampDefinition = COLOR_RAMPS[selectedRamp] || COLOR_RAMPS.viridis;

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const rampList = Object.values(COLOR_RAMPS);

  return (
    <div ref={dropdownRef} className="relative font-mono text-[11px] select-none">
      <div className="flex items-center justify-between text-[10px] uppercase opacity-60 mb-1">
        <span className="flex items-center gap-1 font-bold">
          <Palette className="w-3 h-3 text-blue-700" />
          Colormap Ramp
        </span>
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full text-left bg-white border border-[#141414] p-2 flex flex-col gap-1.5 transition-all shadow-xs hover:border-black focus:outline-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${isOpen ? 'ring-1 ring-[#141414]' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#141414] text-[11px]">{currentRamp.name}</span>
            <span className="text-[8px] uppercase tracking-wider px-1 py-0.2 bg-[#141414]/10 text-[#141414] font-medium">
              {currentRamp.category}
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#141414] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* Dynamic Gradient Bar */}
        <div
          className="w-full h-3 border border-[#141414]/30 relative overflow-hidden"
          style={{ background: currentRamp.cssGradient }}
        >
          <div className="absolute inset-0 flex justify-between items-center px-1 text-[7px] text-white font-bold mix-blend-difference">
            <span>-1.0</span>
            <span>0.0</span>
            <span>+1.0</span>
          </div>
        </div>
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#F9F8F6] border border-[#141414] shadow-lg p-1 space-y-1 max-h-72 overflow-y-auto">
          {rampList.map((ramp) => {
            const isSelected = ramp.id === selectedRamp;
            return (
              <div
                key={ramp.id}
                onClick={() => {
                  onChange(ramp.id);
                  setIsOpen(false);
                }}
                className={`p-2 border transition-all cursor-pointer flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]'
                    : 'bg-white text-[#141414] border-[#141414]/20 hover:bg-[#EAE8E4] hover:border-[#141414]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[11px]">{ramp.name}</span>
                    <span
                      className={`text-[8px] uppercase px-1 py-0.2 font-medium ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-black/10 text-black'
                      }`}
                    >
                      {ramp.category}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>

                {/* Mini Gradient Preview */}
                <div
                  className="w-full h-2 border border-black/20"
                  style={{ background: ramp.cssGradient }}
                />

                <p
                  className={`text-[8px] leading-tight opacity-75 ${
                    isSelected ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  {ramp.description}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface NdwiScaleLegendProps {
  selectedRamp: ColorRampId;
  threshold: number;
}

export function NdwiScaleLegend({ selectedRamp, threshold }: NdwiScaleLegendProps) {
  const ramp = COLOR_RAMPS[selectedRamp] || COLOR_RAMPS.viridis;
  // Threshold position in % from -1.0 to +1.0
  const thresholdPct = Math.max(0, Math.min(100, ((threshold + 1) / 2) * 100));

  return (
    <div className="font-mono text-[9px] bg-black/85 text-white p-2 border border-white/20">
      <div className="flex justify-between items-center mb-1">
        <span className="uppercase text-[8px] tracking-wider font-semibold opacity-90">
          Scale: {ramp.name}
        </span>
        <span className="text-[8px] opacity-75 font-mono">
          Threshold: &gt;{threshold.toFixed(2)}
        </span>
      </div>

      {/* Gradient Bar with Threshold Marker */}
      <div className="relative my-1.5">
        <div
          className="w-full h-2.5 border border-white/30 relative"
          style={{ background: ramp.cssGradient }}
        />
        {/* Needle Pin */}
        <div
          className="absolute -top-0.5 bottom-0 w-[2px] bg-white pointer-events-none z-10"
          style={{ left: `${thresholdPct}%` }}
        >
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[3px] border-t-white" />
        </div>
      </div>

      <div className="flex justify-between items-center text-[7.5px] opacity-70">
        <span>-1.0 (Non-Water)</span>
        <span>0.0</span>
        <span>+1.0 (Water)</span>
      </div>
    </div>
  );
}
