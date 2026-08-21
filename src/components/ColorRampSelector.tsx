import React, { useState, useRef, useEffect } from 'react';
import { Palette, ChevronDown, Check } from 'lucide-react';
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
      <div className="flex items-center justify-between text-[9px] uppercase text-[#94A3B8] mb-1 font-semibold tracking-wider">
        <span className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-[#38BDF8]" />
          Colormap Look-Up Table (LUT)
        </span>
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full text-left bg-[#0A0F1D] border border-[#334155] hover:border-[#2DD4BF] p-2 flex flex-col gap-1.5 transition-all shadow-sm focus:outline-none rounded-xs ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${isOpen ? 'ring-1 ring-[#2DD4BF] border-[#2DD4BF]' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#F1F5F9] text-[11px] tracking-wide">{currentRamp.name}</span>
            <span className="text-[7.5px] uppercase tracking-wider px-1.5 py-0.5 bg-[#1E293B] border border-[#475569] text-[#94A3B8] font-medium rounded-xs">
              {currentRamp.category}
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#2DD4BF]' : ''
            }`}
          />
        </div>

        {/* Dynamic Gradient Bar */}
        <div
          className="w-full h-2.5 border border-[#334155] relative overflow-hidden rounded-xs"
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
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#0E1726]/95 backdrop-blur-md border border-[#334155] shadow-xl p-1.5 space-y-1 max-h-72 overflow-y-auto rounded-xs">
          {rampList.map((ramp) => {
            const isSelected = ramp.id === selectedRamp;
            return (
              <div
                key={ramp.id}
                onClick={() => {
                  onChange(ramp.id);
                  setIsOpen(false);
                }}
                className={`p-2 border transition-all cursor-pointer flex flex-col gap-1 rounded-xs ${
                  isSelected
                    ? 'bg-[#16223D] text-[#F1F5F9] border-[#2DD4BF]'
                    : 'bg-[#0A0F1D] text-[#CBD5E1] border-[#1E293B] hover:bg-[#131F37] hover:border-[#38BDF8]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[10.5px] text-[#F1F5F9]">{ramp.name}</span>
                    <span
                      className={`text-[7.5px] uppercase px-1.5 py-0.2 font-medium rounded-xs ${
                        isSelected ? 'bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/30' : 'bg-[#1E293B] text-[#94A3B8]'
                      }`}
                    >
                      {ramp.category}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#2DD4BF]" />}
                </div>

                {/* Mini Gradient Preview */}
                <div
                  className="w-full h-2 border border-[#334155] rounded-xs"
                  style={{ background: ramp.cssGradient }}
                />

                <p className="text-[8px] leading-tight text-[#94A3B8]">
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
  const thresholdPct = Math.max(0, Math.min(100, ((threshold + 1) / 2) * 100));

  return (
    <div className="font-mono text-[9px] bg-[#0A0F1D] text-[#F1F5F9] p-2 border border-[#334155] rounded-xs">
      <div className="flex justify-between items-center mb-1">
        <span className="uppercase text-[8px] tracking-wider font-semibold text-[#94A3B8]">
          LUT Scale: <span className="text-[#F1F5F9] font-bold">{ramp.name}</span>
        </span>
        <span className="text-[8px] text-[#2DD4BF] font-mono font-semibold">
          Threshold Cutoff: &gt;{threshold.toFixed(2)}
        </span>
      </div>

      {/* Gradient Bar with Threshold Marker */}
      <div className="relative my-1.5">
        <div
          className="w-full h-2 border border-[#334155] relative rounded-xs"
          style={{ background: ramp.cssGradient }}
        />
        {/* Needle Pin */}
        <div
          className="absolute -top-1 bottom-0 w-[1.5px] bg-[#F1F5F9] pointer-events-none z-10 shadow-sm"
          style={{ left: `${thresholdPct}%` }}
        >
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[3.5px] border-t-[#F1F5F9]" />
        </div>
      </div>

      <div className="flex justify-between items-center text-[7.5px] text-[#64748B]">
        <span>-1.0 (Non-Water)</span>
        <span>0.0</span>
        <span className="text-[#38BDF8] font-medium">+1.0 (Water)</span>
      </div>
    </div>
  );
}
