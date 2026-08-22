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
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full text-left bg-[#FFF8F2] border border-[#007979]/25 hover:border-[#007979] p-1.5 flex flex-col gap-1 transition-all shadow-xs focus:outline-none rounded-xs ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${isOpen ? 'ring-1 ring-[#007979] border-[#007979]' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Palette className="w-3 h-3 text-[#007979]" />
            <span className="font-bold text-[#082424] text-[9.5px] tracking-tight">{currentRamp.name}</span>
          </div>
          <ChevronDown
            className={`w-3 h-3 text-[#537575] transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#007979]' : ''
            }`}
          />
        </div>

        {/* Dynamic Gradient Bar */}
        <div
          className="w-full h-2 border border-[#007979]/20 relative overflow-hidden rounded-xs"
          style={{ background: currentRamp.cssGradient }}
        >
          <div className="absolute inset-0 flex justify-between items-center px-1 text-[6.5px] text-white font-bold mix-blend-difference">
            <span>-1.0</span>
            <span>0.0</span>
            <span>+1.0</span>
          </div>
        </div>
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white/98 backdrop-blur-md border border-[#007979]/30 shadow-xl p-1.5 space-y-1 max-h-72 overflow-y-auto rounded-xs">
          {rampList.map((ramp) => {
            const isSelected = ramp.id === selectedRamp;
            return (
              <div
                key={ramp.id}
                onClick={() => {
                  onChange(ramp.id);
                  setIsOpen(false);
                }}
                className={`p-1.5 border transition-all cursor-pointer flex flex-col gap-0.5 rounded-xs ${
                  isSelected
                    ? 'bg-[#007979] text-[#FFF0E4] border-[#007979] font-bold shadow-xs'
                    : 'bg-[#FFF8F2] text-[#082424] border-[#007979]/15 hover:bg-[#FFE0C5]/50 hover:border-[#007979]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[9px]">{ramp.name}</span>
                  {isSelected && <Check className="w-3 h-3 text-[#24B1B1]" />}
                </div>

                {/* Gradient Bar Preview */}
                <div
                  className="w-full h-2 border border-black/10 rounded-xs"
                  style={{ background: ramp.cssGradient }}
                />
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
  const currentRamp = COLOR_RAMPS[selectedRamp] || COLOR_RAMPS.viridis;
  const clampedThreshold = Math.max(-1, Math.min(1, threshold));
  const needlePercent = ((clampedThreshold + 1) / 2) * 100;

  return (
    <div className="flex flex-col gap-1 font-mono text-[8px] select-none">
      <div className="flex items-center justify-between text-[7.5px] text-[#537575]">
        <span>-1.0 (Dry Soil / Land)</span>
        <span className="font-bold text-[#007979]">
          NDWI Threshold Needle: {threshold.toFixed(2)} ({needlePercent.toFixed(0)}%)
        </span>
        <span>+1.0 (Deep Surface Water)</span>
      </div>

      <div className="relative w-full h-2.5 rounded-xs overflow-hidden border border-[#007979]/25 shadow-inner">
        <div className="w-full h-full" style={{ background: currentRamp.cssGradient }} />
        <div
          className="absolute top-0 bottom-0 w-1 bg-white border-x border-[#007979] shadow-md transition-all duration-75 pointer-events-none"
          style={{ left: `calc(${needlePercent}% - 2px)` }}
        />
      </div>
    </div>
  );
}
