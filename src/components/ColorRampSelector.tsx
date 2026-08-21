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
      <div className="flex items-center justify-between text-[10px] uppercase text-[#38BDF8] mb-1 font-bold">
        <span className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-[#22D3EE]" />
          Colormap Look-Up Table (LUT)
        </span>
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full text-left bg-[#071326] border border-[#1D3D73] hover:border-[#22D3EE] p-2.5 flex flex-col gap-1.5 transition-all shadow-md focus:outline-none rounded-sm ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${isOpen ? 'ring-1 ring-[#22D3EE] border-[#22D3EE]' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#F0FDFA] text-[11px] tracking-wide">{currentRamp.name}</span>
            <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 bg-[#22D3EE]/15 border border-[#22D3EE]/30 text-[#22D3EE] font-bold rounded-xs">
              {currentRamp.category}
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#22D3EE] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* Dynamic Gradient Bar */}
        <div
          className="w-full h-3 border border-[#1D3D73] relative overflow-hidden rounded-xs"
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
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#071326]/95 backdrop-blur-md border border-[#22D3EE]/40 shadow-2xl p-1.5 space-y-1.5 max-h-72 overflow-y-auto rounded-sm">
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
                    ? 'bg-[#0C1E3D] text-[#F0FDFA] border-[#22D3EE] shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                    : 'bg-[#0A1832] text-[#CADDAE] border-[#1D3D73]/60 hover:bg-[#102447] hover:border-[#22D3EE]/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[11px] text-[#F0FDFA]">{ramp.name}</span>
                    <span
                      className={`text-[8px] uppercase px-1.5 py-0.5 font-medium rounded-xs ${
                        isSelected ? 'bg-[#22D3EE]/25 text-[#22D3EE] border border-[#22D3EE]/40' : 'bg-black/30 text-[#738CAD]'
                      }`}
                    >
                      {ramp.category}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#22D3EE]" />}
                </div>

                {/* Mini Gradient Preview */}
                <div
                  className="w-full h-2 border border-[#1D3D73] rounded-xs"
                  style={{ background: ramp.cssGradient }}
                />

                <p
                  className={`text-[8.5px] leading-tight ${
                    isSelected ? 'text-[#38BDF8]' : 'text-[#738CAD]'
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
  const thresholdPct = Math.max(0, Math.min(100, ((threshold + 1) / 2) * 100));

  return (
    <div className="font-mono text-[9px] bg-[#071326]/90 backdrop-blur-sm text-[#F0FDFA] p-2.5 border border-[#1D3D73] rounded-sm">
      <div className="flex justify-between items-center mb-1">
        <span className="uppercase text-[8px] tracking-wider font-bold text-[#22D3EE]">
          LUT Scale: {ramp.name}
        </span>
        <span className="text-[8px] text-[#06D6A0] font-mono font-bold">
          Threshold Cutoff: &gt;{threshold.toFixed(2)}
        </span>
      </div>

      {/* Gradient Bar with Threshold Marker */}
      <div className="relative my-2">
        <div
          className="w-full h-2.5 border border-[#1D3D73] relative rounded-xs"
          style={{ background: ramp.cssGradient }}
        />
        {/* Needle Pin */}
        <div
          className="absolute -top-1 bottom-0 w-[2px] bg-[#22D3EE] pointer-events-none z-10 shadow-[0_0_6px_#22D3EE]"
          style={{ left: `${thresholdPct}%` }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[4px] border-t-[#22D3EE]" />
        </div>
      </div>

      <div className="flex justify-between items-center text-[7.5px] text-[#738CAD]">
        <span>-1.0 (Non-Water)</span>
        <span>0.0</span>
        <span className="text-[#22D3EE] font-bold">+1.0 (Water)</span>
      </div>
    </div>
  );
}
