import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Move, Maximize2, RotateCcw, ZoomIn, ZoomOut, Focus } from 'lucide-react';

interface BboxMapEditorProps {
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  onChange: (bbox: [number, number, number, number]) => void;
  disabled?: boolean;
}

type DragTarget = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'move' | null;

export function BboxMapEditor({ bbox, onChange, disabled = false }: BboxMapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [zoom, setZoom] = useState<number>(1.0); // 0.4x to 5.0x
  
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialBbox: [number, number, number, number];
    viewExtent: { minLon: number; minLat: number; maxLon: number; maxLat: number };
  } | null>(null);

  const [minLon, minLat, maxLon, maxLat] = bbox;

  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;

  const lonSpan = Math.max(0.008, maxLon - minLon);
  const latSpan = Math.max(0.008, maxLat - minLat);
  const padRatio = 0.35;

  const viewLonSpan = (lonSpan * (1 + 2 * padRatio)) / zoom;
  const viewLatSpan = (latSpan * (1 + 2 * padRatio)) / zoom;

  const viewMinLon = centerLon - viewLonSpan / 2;
  const viewMaxLon = centerLon + viewLonSpan / 2;
  const viewMinLat = centerLat - viewLatSpan / 2;
  const viewMaxLat = centerLat + viewLatSpan / 2;

  const handleZoomIn = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoom((prev) => Math.min(5.0, parseFloat((prev * 1.3).toFixed(2))));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoom((prev) => Math.max(0.4, parseFloat((prev / 1.3).toFixed(2))));
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoom(1.0);
  };

  const lonToPercent = useCallback((lon: number) => {
    return ((lon - viewMinLon) / (viewMaxLon - viewMinLon)) * 100;
  }, [viewMinLon, viewMaxLon]);

  const latToPercent = useCallback((lat: number) => {
    return ((viewMaxLat - lat) / (viewMaxLat - viewMinLat)) * 100;
  }, [viewMinLat, viewMaxLat]);

  const leftPct = lonToPercent(minLon);
  const rightPct = lonToPercent(maxLon);
  const topPct = latToPercent(maxLat);
  const bottomPct = latToPercent(minLat);

  const boxWidth = rightPct - leftPct;
  const boxHeight = bottomPct - topPct;

  const handleDragStart = (target: DragTarget, clientX: number, clientY: number) => {
    if (disabled) return;
    setDragTarget(target);
    dragStartRef.current = {
      clientX,
      clientY,
      initialBbox: [...bbox],
      viewExtent: { minLon: viewMinLon, minLat: viewMinLat, maxLon: viewMaxLon, maxLat: viewMaxLat },
    };
  };

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!dragTarget || !dragStartRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { clientX: startX, clientY: startY, initialBbox, viewExtent } = dragStartRef.current;

    const deltaPixelX = clientX - startX;
    const deltaPixelY = clientY - startY;

    const totalLonSpan = viewExtent.maxLon - viewExtent.minLon;
    const totalLatSpan = viewExtent.maxLat - viewExtent.minLat;

    const deltaLon = (deltaPixelX / rect.width) * totalLonSpan;
    const deltaLat = -(deltaPixelY / rect.height) * totalLatSpan;

    let [newMinLon, newMinLat, newMaxLon, newMaxLat] = [...initialBbox];

    const minSize = 0.005;

    if (dragTarget === 'move') {
      newMinLon += deltaLon;
      newMaxLon += deltaLon;
      newMinLat += deltaLat;
      newMaxLat += deltaLat;
    } else {
      if (dragTarget === 'nw') {
        newMinLon = Math.min(initialBbox[2] - minSize, initialBbox[0] + deltaLon);
        newMaxLat = Math.max(initialBbox[1] + minSize, initialBbox[3] + deltaLat);
      } else if (dragTarget === 'ne') {
        newMaxLon = Math.max(initialBbox[0] + minSize, initialBbox[2] + deltaLon);
        newMaxLat = Math.max(initialBbox[1] + minSize, initialBbox[3] + deltaLat);
      } else if (dragTarget === 'se') {
        newMaxLon = Math.max(initialBbox[0] + minSize, initialBbox[2] + deltaLon);
        newMinLat = Math.min(initialBbox[3] - minSize, initialBbox[1] + deltaLat);
      } else if (dragTarget === 'sw') {
        newMinLon = Math.min(initialBbox[2] - minSize, initialBbox[0] + deltaLon);
        newMinLat = Math.min(initialBbox[3] - minSize, initialBbox[1] + deltaLat);
      } else if (dragTarget === 'n') {
        newMaxLat = Math.max(initialBbox[1] + minSize, initialBbox[3] + deltaLat);
      } else if (dragTarget === 's') {
        newMinLat = Math.min(initialBbox[3] - minSize, initialBbox[1] + deltaLat);
      } else if (dragTarget === 'e') {
        newMaxLon = Math.max(initialBbox[0] + minSize, initialBbox[2] + deltaLon);
      } else if (dragTarget === 'w') {
        newMinLon = Math.min(initialBbox[2] - minSize, initialBbox[0] + deltaLon);
      }
    }

    onChange([
      parseFloat(newMinLon.toFixed(4)),
      parseFloat(newMinLat.toFixed(4)),
      parseFloat(newMaxLon.toFixed(4)),
      parseFloat(newMaxLat.toFixed(4)),
    ]);
  }, [dragTarget, onChange]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragTarget) handlePointerMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      if (dragTarget) setDragTarget(null);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (dragTarget && e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      if (dragTarget) setDragTarget(null);
    };

    if (dragTarget) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [dragTarget, handlePointerMove]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(5.0, parseFloat((prev * 1.15).toFixed(2))));
    } else if (e.deltaY > 0) {
      setZoom((prev) => Math.max(0.4, parseFloat((prev / 1.15).toFixed(2))));
    }
  };

  const handleManualCoordChange = (index: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const next: [number, number, number, number] = [...bbox];
    next[index] = num;
    if (index === 0 && next[0] >= next[2]) next[2] = next[0] + 0.01;
    if (index === 1 && next[1] >= next[3]) next[3] = next[1] + 0.01;
    if (index === 2 && next[2] <= next[0]) next[0] = next[2] - 0.01;
    if (index === 3 && next[3] <= next[1]) next[1] = next[3] - 0.01;
    onChange(next);
  };

  const handleResetBbox = () => {
    onChange([80.20, 12.91, 80.23, 12.95]);
    setZoom(1.0);
  };

  return (
    <div className="space-y-1.5 font-mono text-[11px]">
      {/* Interactive Map Canvas Container */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="w-full h-44 border border-[#1D3D73] bg-[#071326] overflow-hidden relative select-none rounded-sm shadow-md"
      >
        {/* Background OSM map embed */}
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${viewMinLon.toFixed(4)},${viewMinLat.toFixed(4)},${viewMaxLon.toFixed(4)},${viewMaxLat.toFixed(4)}&layer=mapnik`}
          style={{ border: 'none', pointerEvents: 'none', filter: 'invert(90%) hue-rotate(180deg) brightness(0.9) contrast(1.2)' }}
          title="Interactive BBOX Map"
        />

        {/* Shaded dark mask outside the bbox */}
        <div className="absolute inset-0 bg-[#030712]/30 pointer-events-none" />

        {/* The Interactive BBOX Box */}
        <div
          style={{
            left: `${leftPct}%`,
            top: `${topPct}%`,
            width: `${boxWidth}%`,
            height: `${boxHeight}%`,
          }}
          className={`absolute border-2 border-[#22D3EE] bg-[#22D3EE]/20 z-10 shadow-[0_0_12px_rgba(34,211,238,0.4)] ${
            dragTarget === 'move' ? 'cursor-grabbing border-[#38BDF8] bg-[#22D3EE]/35' : 'cursor-grab'
          }`}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleDragStart('move', e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            handleDragStart('move', e.touches[0].clientX, e.touches[0].clientY);
          }}
        >
          {/* Center Move Icon Badge */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#071326]/90 border border-[#22D3EE] text-[#22D3EE] p-1 rounded-xs shadow pointer-events-none">
            <Move className="w-3 h-3" />
          </div>

          {/* Corner Drag Handles */}
          {/* NW Handle */}
          <div
            className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-[#22D3EE] border-2 border-[#071326] rounded-xs shadow-md cursor-nwse-resize hover:scale-125 z-20"
            title={`NW: [${minLon}, ${maxLat}]`}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart('nw', e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart('nw', e.touches[0].clientX, e.touches[0].clientY);
            }}
          />

          {/* NE Handle */}
          <div
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#22D3EE] border-2 border-[#071326] rounded-xs shadow-md cursor-nesw-resize hover:scale-125 z-20"
            title={`NE: [${maxLon}, ${maxLat}]`}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart('ne', e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart('ne', e.touches[0].clientX, e.touches[0].clientY);
            }}
          />

          {/* SE Handle */}
          <div
            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-[#22D3EE] border-2 border-[#071326] rounded-xs shadow-md cursor-nwse-resize hover:scale-125 z-20"
            title={`SE: [${maxLon}, ${minLat}]`}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart('se', e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart('se', e.touches[0].clientX, e.touches[0].clientY);
            }}
          />

          {/* SW Handle */}
          <div
            className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-[#22D3EE] border-2 border-[#071326] rounded-xs shadow-md cursor-nesw-resize hover:scale-125 z-20"
            title={`SW: [${minLon}, ${minLat}]`}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart('sw', e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart('sw', e.touches[0].clientX, e.touches[0].clientY);
            }}
          />

          {/* Edge Midpoint Drag Handles */}
          {/* North */}
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-[#22D3EE] border border-[#071326] rounded-xs cursor-ns-resize z-20 hover:scale-110"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart('n', e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart('n', e.touches[0].clientX, e.touches[0].clientY);
            }}
          />
          {/* South */}
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-[#22D3EE] border border-[#071326] rounded-xs cursor-ns-resize z-20 hover:scale-110"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart('s', e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart('s', e.touches[0].clientX, e.touches[0].clientY);
            }}
          />
          {/* East */}
          <div
            className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-4 bg-[#22D3EE] border border-[#071326] rounded-xs cursor-ew-resize z-20 hover:scale-110"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart('e', e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart('e', e.touches[0].clientX, e.touches[0].clientY);
            }}
          />
          {/* West */}
          <div
            className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-4 bg-[#22D3EE] border border-[#071326] rounded-xs cursor-ew-resize z-20 hover:scale-110"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleDragStart('w', e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handleDragStart('w', e.touches[0].clientX, e.touches[0].clientY);
            }}
          />
        </div>

        {/* Live Coordinate Badge Overlay */}
        <div className="absolute top-1.5 left-1.5 bg-[#071326]/90 border border-[#1D3D73] text-[#38BDF8] text-[8px] px-2 py-0.5 pointer-events-none z-30 font-mono rounded-xs shadow">
          AOI BBOX: {minLon.toFixed(3)}°E, {minLat.toFixed(3)}°N → {maxLon.toFixed(3)}°E, {maxLat.toFixed(3)}°N
        </div>

        {/* Floating Zoom Navigation Controls */}
        <div className="absolute top-1.5 right-1.5 flex flex-col bg-[#071326]/90 border border-[#1D3D73] shadow-md z-30 divide-y divide-[#1D3D73] rounded-xs">
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={disabled || zoom >= 5.0}
            className="p-1 text-[#22D3EE] hover:bg-[#0C1E3D] transition-colors disabled:opacity-30 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={disabled || zoom <= 0.4}
            className="p-1 text-[#22D3EE] hover:bg-[#0C1E3D] transition-colors disabled:opacity-30 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            disabled={disabled || zoom === 1.0}
            className={`p-1 text-[#22D3EE] hover:bg-[#0C1E3D] transition-colors cursor-pointer ${
              zoom === 1.0 ? 'opacity-30' : 'opacity-100'
            }`}
            title="Reset Zoom"
          >
            <Focus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Numerical Coordinate Fine-Tuning Grid */}
      <div className="bg-[#071326] border border-[#1D3D73] p-2 text-[9px] rounded-sm">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-bold uppercase text-[8px] text-[#38BDF8]">Bounding Coordinates (Deg)</span>
          <button
            type="button"
            onClick={handleResetBbox}
            className="text-[8px] text-[#06D6A0] hover:underline flex items-center gap-1 cursor-pointer font-bold"
            title="Reset to default coordinates"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Reset Default
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between bg-[#0C1E3D] px-2 py-1 border border-[#1D3D73] rounded-xs">
            <span className="text-[#738CAD] text-[8px]">MIN LON:</span>
            <input
              type="number"
              step="0.001"
              value={minLon}
              onChange={(e) => handleManualCoordChange(0, e.target.value)}
              className="w-14 text-right font-bold text-[#F0FDFA] bg-transparent focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between bg-[#0C1E3D] px-2 py-1 border border-[#1D3D73] rounded-xs">
            <span className="text-[#738CAD] text-[8px]">MIN LAT:</span>
            <input
              type="number"
              step="0.001"
              value={minLat}
              onChange={(e) => handleManualCoordChange(1, e.target.value)}
              className="w-14 text-right font-bold text-[#F0FDFA] bg-transparent focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between bg-[#0C1E3D] px-2 py-1 border border-[#1D3D73] rounded-xs">
            <span className="text-[#738CAD] text-[8px]">MAX LON:</span>
            <input
              type="number"
              step="0.001"
              value={maxLon}
              onChange={(e) => handleManualCoordChange(2, e.target.value)}
              className="w-14 text-right font-bold text-[#F0FDFA] bg-transparent focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between bg-[#0C1E3D] px-2 py-1 border border-[#1D3D73] rounded-xs">
            <span className="text-[#738CAD] text-[8px]">MAX LAT:</span>
            <input
              type="number"
              step="0.001"
              value={maxLat}
              onChange={(e) => handleManualCoordChange(3, e.target.value)}
              className="w-14 text-right font-bold text-[#F0FDFA] bg-transparent focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
