import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Database, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Download, 
  Upload, 
  Info, 
  SlidersHorizontal, 
  Sliders, 
  RefreshCw,
  Palette,
  Maximize2,
  Compass,
  Eye,
  Activity
} from 'lucide-react';
import * as turf from '@turf/turf';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AiEcologicalInsights } from './components/AiEcologicalInsights';
import { ImageSplitSlider } from './components/ImageSplitSlider';
import { BboxMapEditor } from './components/BboxMapEditor';
import { ColorRampSelector, NdwiScaleLegend } from './components/ColorRampSelector';
import { ColorRampId, COLOR_RAMPS } from './utils/colorRamps';
import { 
  countWaterPixelsWithThreshold, 
  generateDifferenceMapWithThreshold, 
  colorizeNdwiRaster,
  getCachedImage 
} from './utils/rasterAnalysis';

type Step = 'setup' | 'processing' | 'results';
type MapView = 'split' | 'ndwi_split' | 'diff' | 'ndwi_a' | 'ndwi_b' | 'yearA' | 'yearB';

interface SceneData {
  id: string;
  trueColor: string;
  ndwi: string;
  colorizedNdwi?: string;
  area: number;
  cloudCover: number;
  date: string;
}

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>('setup');
  const [mapView, setMapView] = useState<MapView>('split');
  const [colorRamp, setColorRamp] = useState<ColorRampId>('viridis');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [diffMap, setDiffMap] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<{year: string, area: number}[]>([]);
  
  const [config, setConfig] = useState({
    waterBody: 'PALLIKARANAI_MARSH_CHENNAI',
    years: ['2019', '2025'],
    bbox: [80.20, 12.91, 80.23, 12.95] as [number, number, number, number],
    maxCloudCover: 20, // Dynamic STAC query cloud cover % threshold
    ndwiThreshold: 0.20 // Dynamic NDWI water classification threshold
  });

  const [sceneData, setSceneData] = useState<{yearA: SceneData, yearB: SceneData} | null>(null);
  const intermediateSnapshotsRef = useRef<{ year: string; ndwiUrl: string }[]>([]);
  const [isRecalculatingThreshold, setIsRecalculatingThreshold] = useState(false);

  // Recalculate pixel analysis, colorized rasters, and diff map in real-time when ndwiThreshold or colorRamp changes
  const applyNdwiThresholdAndRamp = async (newThreshold: number, newRamp: ColorRampId) => {
    if (!sceneData) return;
    setIsRecalculatingThreshold(true);
    try {
      const [pixelsA, pixelsB, newDiff, colorizedA, colorizedB] = await Promise.all([
        countWaterPixelsWithThreshold(sceneData.yearA.ndwi, newThreshold),
        countWaterPixelsWithThreshold(sceneData.yearB.ndwi, newThreshold),
        generateDifferenceMapWithThreshold(sceneData.yearA.ndwi, sceneData.yearB.ndwi, newThreshold, newRamp),
        colorizeNdwiRaster(sceneData.yearA.ndwi, newRamp, { threshold: newThreshold }),
        colorizeNdwiRaster(sceneData.yearB.ndwi, newRamp, { threshold: newThreshold })
      ]);

      const areaA = pixelsA * 0.0001;
      const areaB = pixelsB * 0.0001;

      // Update intermediate trend snapshots with new threshold
      const updatedTrendIntermediates = await Promise.all(
        intermediateSnapshotsRef.current.map(async (s) => {
          const px = await countWaterPixelsWithThreshold(s.ndwiUrl, newThreshold);
          return { year: s.year, area: px * 0.0001 };
        })
      );

      const newTrend = [
        { year: config.years[0], area: areaA },
        ...updatedTrendIntermediates,
        { year: config.years[1], area: areaB }
      ].sort((a, b) => parseInt(a.year) - parseInt(b.year));

      setTrendData(newTrend);
      setDiffMap(newDiff);
      setSceneData(prev => prev ? ({
        yearA: { ...prev.yearA, area: areaA, colorizedNdwi: colorizedA },
        yearB: { ...prev.yearB, area: areaB, colorizedNdwi: colorizedB }
      }) : null);

      setLogs(prev => [
        ...prev, 
        `[COMPUTE] Updated NDWI Ramp (${COLOR_RAMPS[newRamp].name}) & Threshold (${newThreshold.toFixed(2)}) → Area A: ${areaA.toFixed(2)} km², Area B: ${areaB.toFixed(2)} km²`
      ]);
    } catch (e: any) {
      setLogs(prev => [...prev, `[ERROR] Failed to update threshold or colormap: ${e.message}`]);
    } finally {
      setIsRecalculatingThreshold(false);
    }
  };

  const handleRampChange = (newRamp: ColorRampId) => {
    setColorRamp(newRamp);
    if (sceneData) {
      applyNdwiThresholdAndRamp(config.ndwiThreshold, newRamp);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const geojson = JSON.parse(event.target?.result as string);
        const calculatedBbox = turf.bbox(geojson) as [number, number, number, number];
        setConfig(prev => ({ 
          ...prev, 
          bbox: calculatedBbox, 
          waterBody: file.name.replace(/\.[^/.]+$/, "").toUpperCase() 
        }));
        setLogs(prev => [...prev, `[SYSTEM] Loaded GeoJSON BBOX: ${calculatedBbox.map(n => n.toFixed(4)).join(', ')}`]);
      } catch (err) {
        setLogs(prev => [...prev, `[ERROR] Invalid GeoJSON file.`]);
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    if (!sceneData) return;
    const exportData = {
      timestamp: new Date().toISOString(),
      system_hash: "0x8a92f02c",
      methodology: `NDWI threshold > ${config.ndwiThreshold.toFixed(2)}, Sentinel-2 10m resolution (0.0001 km2/pixel)`,
      parameters: {
        max_cloud_cover_filter: `${config.maxCloudCover}%`,
        ndwi_threshold: config.ndwiThreshold,
        ndwi_color_ramp: COLOR_RAMPS[colorRamp].name
      },
      study_area: {
        location: config.waterBody,
        bbox: config.bbox,
        baseline_year: config.years[0],
        latest_year: config.years[1]
      },
      quantification: {
        yearA_water_km2: sceneData.yearA.area,
        yearB_water_km2: sceneData.yearB.area,
        absolute_change_km2: sceneData.yearB.area - sceneData.yearA.area,
        relative_change_pct: ((sceneData.yearB.area - sceneData.yearA.area) / sceneData.yearA.area) * 100
      },
      source_scenes: {
        yearA_id: sceneData.yearA.id,
        yearB_id: sceneData.yearB.id
      }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aquasense_provenance_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLogs(prev => [...prev, `[SYSTEM] Exported provenance metadata.`]);
  };

  const runPipeline = async () => {
    setCurrentStep('processing');
    setError(null);
    setLogs(['[SYSTEM] Initializing AquaSense Planetary Computer Pipeline...']);
    
    try {
      const bboxStr = config.bbox.join(',');
      const width = 325;
      const height = 445;

      // STAC Catalog query returning top candidate scenes for automatic fallback / retry on failure
      const searchStacCandidates = async (year: string, isStart: boolean) => {
        const dateRange = (isStart && year === '2019') 
          ? '2019-03-01T00:00:00Z/2019-03-31T23:59:59Z' 
          : `${year}-01-01T00:00:00Z/${year}-12-31T23:59:59Z`;
        
        setLogs(prev => [...prev, `[STAC] Searching catalog for ${year} (${dateRange}) with cloud cover < ${config.maxCloudCover}%...`]);
        
        const res = await fetch('https://planetarycomputer.microsoft.com/api/stac/v1/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collections: ["sentinel-2-l2a"],
            bbox: config.bbox,
            datetime: dateRange,
            query: { "eo:cloud_cover": { "lt": config.maxCloudCover } },
            sortby: [{ field: "eo:cloud_cover", direction: "asc" }],
            limit: 5
          })
        });
        
        if (!res.ok) throw new Error(`STAC API responded with status ${res.status}`);
        const data = await res.json();
        
        if (!data.features || data.features.length === 0) {
          throw new Error(`No scenes found for ${year} with cloud cover < ${config.maxCloudCover}%. Try increasing the cloud cover threshold slider.`);
        }
        
        setLogs(prev => [...prev, `[STAC] Found ${data.features.length} candidate scenes for ${year} (best cloud cover: ${data.features[0].properties['eo:cloud_cover'].toFixed(1)}%)`]);
        return data.features;
      };

      // Scene resolver with automatic Retry-On-Failure across candidate scenes
      const resolveWorkingScene = async (year: string, candidates: any[]) => {
        let lastError: any = null;

        for (let i = 0; i < candidates.length; i++) {
          const item = candidates[i];
          const rank = i + 1;
          const cloudPct = item.properties['eo:cloud_cover']?.toFixed(1) ?? '0.0';

          const tcUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/preview.png?collection=sentinel-2-l2a&item=${item.id}&assets=visual&width=${width}&height=${height}&bbox=${bboxStr}`;
          const ndwiUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/preview.png?collection=sentinel-2-l2a&item=${item.id}&expression=(B03-B08)/(B03%2BB08)&asset_as_band=True&rescale=-1,1&width=${width}&height=${height}&bbox=${bboxStr}`;

          try {
            setLogs(prev => [...prev, `[STAC] Testing candidate #${rank}/${candidates.length}: ${item.id} (Cloud: ${cloudPct}%)...`]);
            
            // Verify and pre-cache both True Color and NDWI rasters
            await Promise.all([
              getCachedImage(tcUrl),
              getCachedImage(ndwiUrl)
            ]);

            const pixels = await countWaterPixelsWithThreshold(ndwiUrl, config.ndwiThreshold);
            const area = pixels * 0.0001;
            const colorized = await colorizeNdwiRaster(ndwiUrl, colorRamp, { threshold: config.ndwiThreshold });

            setLogs(prev => [...prev, `[STAC] Verified scene #${rank}: ${item.id} (Cloud: ${cloudPct}%, Water: ${area.toFixed(2)} km²)`]);

            return {
              item,
              tcUrl,
              ndwiUrl,
              colorized,
              pixels,
              area
            };
          } catch (err: any) {
            lastError = err;
            setLogs(prev => [
              ...prev, 
              `[WARN] Candidate scene #${rank} (${item.id}) failed raster processing (${err.message || 'Image load error'}). [RETRY-ON-FAILURE] Attempting next best scene in catalog...`
            ]);
          }
        }

        throw new Error(`All ${candidates.length} candidate scenes for ${year} failed during raster processing. Last error: ${lastError?.message || 'Unknown'}`);
      };

      const candidatesA = await searchStacCandidates(config.years[0], true);
      const sceneA = await resolveWorkingScene(config.years[0], candidatesA);

      const candidatesB = await searchStacCandidates(config.years[1], false);
      const sceneB = await resolveWorkingScene(config.years[1], candidatesB);

      setLogs(prev => [...prev, `[COMPUTE] Executing initial NDWI pixel classification (Threshold > ${config.ndwiThreshold.toFixed(2)})...`]);
      setLogs(prev => [...prev, `[COMPUTE] Colorizing NDWI rasters with ${COLOR_RAMPS[colorRamp].name} LUT ramp...`]);
      setLogs(prev => [...prev, `[COMPUTE] Computed ${config.years[0]} water extent: ${sceneA.area.toFixed(2)} km²`]);
      setLogs(prev => [...prev, `[COMPUTE] Computed ${config.years[1]} water extent: ${sceneB.area.toFixed(2)} km²`]);

      setLogs(prev => [...prev, `[COMPUTE] Generating temporal difference map...`]);
      const generatedDiffMap = await generateDifferenceMapWithThreshold(sceneA.ndwiUrl, sceneB.ndwiUrl, config.ndwiThreshold, colorRamp);
      setDiffMap(generatedDiffMap);

      setLogs(prev => [...prev, `[STAC] Fetching intermediate annual snapshots for trend analysis...`]);
      
      const startY = parseInt(config.years[0]);
      const endY = parseInt(config.years[1]);
      const intermediateYears = [];
      for (let y = startY + 1; y < endY; y++) {
        intermediateYears.push(y.toString());
      }
      
      const intermediateSnapshots: { year: string; ndwiUrl: string }[] = [];
      const intermediatePromises = intermediateYears.map(async (year) => {
        try {
          const dateRange = `${year}-01-01T00:00:00Z/${year}-12-31T23:59:59Z`;
          const res = await fetch('https://planetarycomputer.microsoft.com/api/stac/v1/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              collections: ["sentinel-2-l2a"],
              bbox: config.bbox,
              datetime: dateRange,
              query: { "eo:cloud_cover": { "lt": config.maxCloudCover } },
              sortby: [{ field: "eo:cloud_cover", direction: "asc" }],
              limit: 3
            })
          });
          if (!res.ok) return null;
          const data = await res.json();
          if (!data.features || data.features.length === 0) return null;

          // Try intermediate candidates
          for (const item of data.features) {
            try {
              const ndwiUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/preview.png?collection=sentinel-2-l2a&item=${item.id}&expression=(B03-B08)/(B03%2BB08)&asset_as_band=True&rescale=-1,1&width=${width}&height=${height}&bbox=${bboxStr}`;
              const pixels = await countWaterPixelsWithThreshold(ndwiUrl, config.ndwiThreshold);
              intermediateSnapshots.push({ year, ndwiUrl });
              return { year, area: pixels * 0.0001 };
            } catch (e) {
              continue;
            }
          }
          return null;
        } catch (e) {
          return null;
        }
      });
      
      const intermediateResults = await Promise.all(intermediatePromises);
      const validIntermediates = intermediateResults.filter((r): r is {year: string, area: number} => r !== null);
      intermediateSnapshotsRef.current = intermediateSnapshots;
      
      const newTrendData = [
        { year: config.years[0], area: sceneA.area },
        ...validIntermediates,
        { year: config.years[1], area: sceneB.area }
      ].sort((a, b) => parseInt(a.year) - parseInt(b.year));
      
      setTrendData(newTrendData);

      setSceneData({
        yearA: { 
          id: sceneA.item.id, 
          trueColor: sceneA.tcUrl, 
          ndwi: sceneA.ndwiUrl, 
          colorizedNdwi: sceneA.colorized,
          area: sceneA.area, 
          cloudCover: sceneA.item.properties['eo:cloud_cover'], 
          date: new Date(sceneA.item.properties.datetime).toLocaleDateString() 
        },
        yearB: { 
          id: sceneB.item.id, 
          trueColor: sceneB.tcUrl, 
          ndwi: sceneB.ndwiUrl, 
          colorizedNdwi: sceneB.colorized,
          area: sceneB.area, 
          cloudCover: sceneB.item.properties['eo:cloud_cover'], 
          date: new Date(sceneB.item.properties.datetime).toLocaleDateString() 
        }
      });
      
      setLogs(prev => [...prev, `[SYSTEM] Pipeline run completed successfully with verified STAC scenes.`]);
      setCurrentStep('results');
      setMapView('split');

    } catch (err: any) {
      setLogs(prev => [...prev, `[ERROR] ${err.message}`]);
      setError(err.message);
      setCurrentStep('setup');
    }
  };

  const change = sceneData ? sceneData.yearB.area - sceneData.yearA.area : 0;
  const pctChange = sceneData ? (change / sceneData.yearA.area) * 100 : 0;

  return (
    <div className='flex flex-col w-full min-h-screen lg:h-screen bg-[#E5E3DF] text-[#141414] font-sans overflow-x-hidden overflow-y-auto lg:overflow-hidden selection:bg-[#141414] selection:text-[#E5E3DF]'>
      
      {/* Top Cartographic Header */}
      <header className='flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#141414] px-6 py-3.5 bg-[#DEDCD8] flex-shrink-0 gap-3 md:gap-0 z-20'>
        <div className='flex items-center gap-3'>
          <div className='w-7 h-7 bg-[#141414] text-[#E5E3DF] flex items-center justify-center font-mono font-bold text-xs shadow-xs'>
            Ω
          </div>
          <div className='flex flex-col'>
            <div className='flex items-center gap-2'>
              <h1 className='font-serif italic text-2xl tracking-tight leading-none'>
                AquaSense
              </h1>
              <span className='text-[9px] not-italic bg-[#141414] text-[#E5E3DF] px-1.5 py-0.5 font-mono uppercase font-bold tracking-widest'>
                STAC • EO-HYDRO
              </span>
            </div>
            <div className='text-[10px] font-mono opacity-60 uppercase tracking-tight mt-0.5 flex items-center gap-2'>
              <span>Sentinel-2 Spectral Ingestion</span>
              <span>•</span>
              <span className='font-bold text-[#141414]'>{config.waterBody}</span>
            </div>
          </div>
        </div>

        {/* Telemetry and Source Status */}
        <div className='flex flex-wrap items-center gap-4 md:gap-6'>
          <div className='hidden sm:flex flex-col items-end'>
            <span className='text-[9px] font-mono uppercase opacity-50 tracking-wider'>Colormap LUT</span>
            <div className='flex items-center gap-1.5'>
              <div 
                className='w-3.5 h-2 border border-[#141414]/50' 
                style={{ background: COLOR_RAMPS[colorRamp].cssGradient }} 
              />
              <span className='text-xs font-mono font-bold uppercase'>{COLOR_RAMPS[colorRamp].name}</span>
            </div>
          </div>

          <div className='flex flex-col items-start md:items-end'>
            <span className='text-[9px] font-mono uppercase opacity-50 tracking-wider'>STAC Data Node</span>
            <span className='text-xs font-mono font-bold'>PLANETARY COMPUTER</span>
          </div>

          <div className='flex flex-col items-start md:items-end'>
            <span className='text-[9px] font-mono uppercase opacity-50 tracking-wider'>NDWI Method</span>
            <span className='text-xs font-mono font-bold text-blue-800 bg-blue-100/80 px-1 border border-blue-300'>
              (B03-B08)/(B03+B08)
            </span>
          </div>
        </div>
      </header>

      {/* Main Observatory Layout */}
      <main className='flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-y-auto lg:overflow-hidden min-h-0'>
        
        {/* Left Parameter Panel */}
        <aside className='w-full lg:col-span-3 border-b lg:border-b-0 lg:border-r border-[#141414] flex flex-col bg-[#D7D4CF] order-1 lg:order-none overflow-y-auto max-h-none lg:max-h-full'>
          
          {/* Pipeline Stage Tracker */}
          <section className='p-4 border-b border-[#141414] flex-shrink-0 bg-[#CECBC5]/50'>
            <div className='text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414]/70 mb-2 flex justify-between items-center'>
              <span>Pipeline Telemetry</span>
              <div className={`text-[9px] font-mono uppercase px-2 py-0.5 border border-[#141414] font-bold ${
                currentStep === 'processing' 
                  ? 'bg-amber-400 text-black animate-pulse' 
                  : currentStep === 'results' 
                  ? 'bg-[#141414] text-[#E5E3DF]' 
                  : 'bg-white text-black'
              }`}>
                {currentStep === 'processing' ? 'COMPUTING' : currentStep === 'results' ? 'CONVERGED' : 'STANDBY'}
              </div>
            </div>
            
            <div className='space-y-2 mt-3'>
              <div className='flex items-center gap-2'>
                <Database className={`w-3.5 h-3.5 ${currentStep !== 'setup' ? 'text-black font-bold' : 'opacity-30'}`} />
                <span className={`text-[10px] font-mono uppercase ${currentStep !== 'setup' ? 'opacity-100 font-bold' : 'opacity-40'}`}>
                  1. Planetary Computer STAC
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <Layers className={`w-3.5 h-3.5 ${currentStep === 'processing' || currentStep === 'results' ? 'text-black font-bold' : 'opacity-30'}`} />
                <span className={`text-[10px] font-mono uppercase ${currentStep === 'processing' || currentStep === 'results' ? 'opacity-100 font-bold' : 'opacity-40'}`}>
                  2. NDWI Raster & Colormap LUT
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <CheckCircle2 className={`w-3.5 h-3.5 ${currentStep === 'results' ? 'text-blue-800 font-bold' : 'opacity-30'}`} />
                <span className={`text-[10px] font-mono uppercase ${currentStep === 'results' ? 'opacity-100 font-bold text-blue-900' : 'opacity-40'}`}>
                  3. Hydrological Differencing
                </span>
              </div>
            </div>
          </section>
          
          {/* Controls & Configuration */}
          <section className='p-4 flex-1 overflow-y-auto space-y-4'>
            <div className='text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414]/70 border-b border-[#141414]/20 pb-1 flex items-center justify-between'>
              <span>Area of Interest & Parameters</span>
              <Compass className="w-3 h-3 opacity-60" />
            </div>
            
            {/* Target Water Body */}
            <div>
              <div className='text-[9px] font-mono uppercase opacity-60 mb-1 font-bold'>Target Hydro Feature</div>
              <input 
                type="text" 
                value={config.waterBody}
                onChange={e => setConfig({...config, waterBody: e.target.value})}
                className="w-full bg-white border border-[#141414] px-2 py-1 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#141414]"
              />
              
              {/* Interactive BBOX Map with Drag Handles */}
              <div className='mt-2.5 mb-2'>
                <div className='text-[9px] font-mono uppercase opacity-60 mb-1 flex items-center justify-between'>
                  <span>Interactive Geo BBOX</span>
                  <span className='text-[8px] text-blue-800 font-bold'>DRAG CORNER ANCHORS</span>
                </div>
                <BboxMapEditor
                  bbox={config.bbox}
                  onChange={(newBbox) => setConfig({ ...config, bbox: newBbox })}
                  disabled={currentStep === 'processing'}
                />
              </div>

              <label className='cursor-pointer inline-flex bg-[#141414] hover:bg-[#2a2a2a] text-[#E4E3E0] text-[9px] font-mono uppercase px-2 py-1 items-center gap-1.5 transition-colors mt-1 shadow-xs'>
                <Upload className="w-3 h-3" />
                Upload GeoJSON Boundary
                <input type="file" accept=".geojson,application/geo+json" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            {/* NDWI Color Ramp Dropdown Component */}
            <div className='border-l-2 border-[#141414] pl-2.5 py-1 bg-white/40 p-2.5 border border-[#141414]/15'>
              <ColorRampSelector
                selectedRamp={colorRamp}
                onChange={handleRampChange}
                disabled={currentStep === 'processing'}
              />
            </div>

            {/* Dynamic Max Cloud Cover Filter Slider */}
            <div className='border-l-2 border-[#141414] pl-2.5 py-1 bg-white/40 p-2 font-mono border border-[#141414]/15'>
              <div className='flex items-center justify-between text-[10px] font-mono uppercase mb-1'>
                <span className='opacity-70 font-bold'>Cloud Cover Filter</span>
                <span className='font-bold bg-[#141414] text-[#E4E3E0] px-1.5 py-0.5 text-[9px]'>
                  &lt; {config.maxCloudCover}%
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="80"
                step="1"
                value={config.maxCloudCover}
                disabled={currentStep === 'processing'}
                onChange={(e) => setConfig({ ...config, maxCloudCover: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-gray-400 rounded-lg appearance-none cursor-pointer accent-[#141414]"
              />
              <div className='flex justify-between items-center text-[8px] opacity-60 mt-1'>
                <span>1% (Strict)</span>
                <div className='flex gap-1'>
                  {[10, 20, 35, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setConfig({ ...config, maxCloudCover: preset })}
                      className={`px-1 py-0.2 border text-[8px] font-bold ${
                        config.maxCloudCover === preset ? 'bg-[#141414] text-white border-black' : 'bg-white border-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
                <span>80%</span>
              </div>
            </div>
            
            {/* Temporal Epochs Selection */}
            <div className='grid grid-cols-2 gap-2'>
              <div className='border border-[#141414]/30 bg-white/60 p-2'>
                <div className='text-[9px] font-mono uppercase opacity-60 font-bold'>Baseline Epoch A</div>
                <input 
                  type="text" 
                  value={config.years[0]}
                  onChange={e => setConfig({...config, years: [e.target.value, config.years[1]]})}
                  className="bg-transparent text-sm font-mono font-bold w-full focus:outline-none border-b border-black/20 focus:border-[#141414] py-0.5"
                />
                <div className='text-[8px] font-mono opacity-75 mt-1 truncate'>
                  {sceneData ? sceneData.yearA.date : 'Pending query'}
                </div>
              </div>

              <div className='border border-[#141414]/30 bg-white/60 p-2'>
                <div className='text-[9px] font-mono uppercase opacity-60 font-bold'>Target Epoch B</div>
                <input 
                  type="text" 
                  value={config.years[1]}
                  onChange={e => setConfig({...config, years: [config.years[0], e.target.value]})}
                  className="bg-transparent text-sm font-mono font-bold w-full focus:outline-none border-b border-black/20 focus:border-[#141414] py-0.5"
                />
                <div className='text-[8px] font-mono opacity-75 mt-1 truncate'>
                  {sceneData ? sceneData.yearB.date : 'Pending query'}
                </div>
              </div>
            </div>

            {/* Run Pipeline Action Button */}
            <button
              onClick={runPipeline}
              disabled={currentStep === 'processing'}
              className="w-full mt-2 bg-[#141414] hover:bg-black text-[#E5E3DF] font-mono text-xs font-bold py-3 px-4 flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md cursor-pointer active:translate-y-0.5"
            >
              {currentStep === 'processing' ? (
                <Cpu className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              )}
              {currentStep === 'processing' ? 'PROCESSING STAC SCENES...' : 'INITIALIZE PIPELINE RUN'}
            </button>
          </section>
        </aside>

        {/* Center Cartographic Canvas */}
        <div className='w-full lg:col-span-6 bg-[#161616] relative min-h-[460px] lg:min-h-0 order-2 lg:order-none flex-shrink-0 flex flex-col justify-between overflow-hidden'>
          
          {/* Top Canvas Bar & Viewport Modes */}
          <div className='p-3 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#161616]/90 backdrop-blur-sm'>
            
            {/* View Mode Segmented Controls */}
            <div className='flex flex-wrap gap-1 text-[9px] font-mono'>
              <button 
                onClick={() => setMapView('split')} 
                title="True Color Swipe Comparison"
                className={`py-1 px-2 border transition-colors flex items-center gap-1 ${
                  mapView === 'split' 
                    ? 'bg-white text-black font-bold border-white' 
                    : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                }`}>
                <SlidersHorizontal className="w-2.5 h-2.5" /> TRUE COLOR SWIPE
              </button>

              <button 
                onClick={() => setMapView('ndwi_split')} 
                title="Color-Ramped NDWI Swipe Comparison"
                className={`py-1 px-2 border transition-colors flex items-center gap-1 ${
                  mapView === 'ndwi_split' 
                    ? 'bg-blue-600 text-white font-bold border-blue-400' 
                    : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                }`}>
                <Palette className="w-2.5 h-2.5 text-cyan-300" /> NDWI SWIPE ({COLOR_RAMPS[colorRamp].name})
              </button>

              <button 
                onClick={() => setMapView('diff')} 
                title="Water Extent Temporal Difference Mask"
                className={`py-1 px-2 border transition-colors flex items-center gap-1 ${
                  mapView === 'diff' 
                    ? 'bg-white text-black font-bold border-white' 
                    : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                }`}>
                <Activity className="w-2.5 h-2.5" /> DIFF MASK
              </button>

              <button 
                onClick={() => setMapView('ndwi_b')} 
                title="Epoch B NDWI Colormap"
                className={`py-1 px-2 border transition-colors ${
                  mapView === 'ndwi_b' 
                    ? 'bg-white text-black font-bold border-white' 
                    : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                }`}>
                NDWI (T1)
              </button>

              <button 
                onClick={() => setMapView('yearB')} 
                title="Epoch B True Color"
                className={`py-1 px-2 border transition-colors ${
                  mapView === 'yearB' 
                    ? 'bg-white text-black font-bold border-white' 
                    : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                }`}>
                RAW (T1)
              </button>
            </div>

            {/* Live Indicator */}
            <div className='flex items-center gap-2'>
              {currentStep === 'results' && isRecalculatingThreshold && (
                <div className='flex items-center gap-1 text-[9px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 border border-cyan-700/50'>
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span>CALCULATING LUT</span>
                </div>
              )}
              <div className='bg-black/90 px-2 py-0.5 text-[9px] font-mono border border-white/20 text-white/90'>
                SCALE: 10m/px
              </div>
            </div>
          </div>
          
          {/* Main Visual Display Stage */}
          <div className='w-full flex-1 flex items-center justify-center relative overflow-hidden p-3 md:p-5'>
            
            {/* Center Canvas Container */}
            <div className={
              mapView === 'diff' 
                ? 'w-full max-w-[800px] aspect-[2/1] border border-white/30 relative bg-[#0d0d0d] shadow-2xl overflow-hidden' 
                : 'w-full max-w-[520px] aspect-square border border-white/30 relative bg-[#0d0d0d] shadow-2xl flex flex-col overflow-hidden'
            }>
              {currentStep === 'results' && sceneData ? (
                mapView === 'split' ? (
                  <ImageSplitSlider
                    imageA={sceneData.yearA.trueColor}
                    imageB={sceneData.yearB.trueColor}
                    labelA={`${config.years[0]} True Color (T0)`}
                    labelB={`${config.years[1]} True Color (T1)`}
                    dateA={sceneData.yearA.date}
                    dateB={sceneData.yearB.date}
                    idA={sceneData.yearA.id}
                    idB={sceneData.yearB.id}
                  />
                ) : mapView === 'ndwi_split' ? (
                  <ImageSplitSlider
                    imageA={sceneData.yearA.colorizedNdwi || sceneData.yearA.ndwi}
                    imageB={sceneData.yearB.colorizedNdwi || sceneData.yearB.ndwi}
                    labelA={`${config.years[0]} NDWI (${COLOR_RAMPS[colorRamp].name})`}
                    labelB={`${config.years[1]} NDWI (${COLOR_RAMPS[colorRamp].name})`}
                    dateA={sceneData.yearA.date}
                    dateB={sceneData.yearB.date}
                    idA={sceneData.yearA.id}
                    idB={sceneData.yearB.id}
                  />
                ) : mapView === 'diff' ? (
                  <div className='flex w-full h-full'>
                    {/* Left: Raw True Color Reference */}
                    <div className='flex-1 border-r border-white/20 relative'>
                      <div className='absolute top-2 left-2 bg-black/85 px-2 py-0.5 text-[9px] font-mono text-white z-10 border border-white/20'>
                        TRUE COLOR (T1)
                      </div>
                      <img 
                        src={sceneData.yearB.trueColor} 
                        className="w-full h-full object-cover" 
                        crossOrigin="anonymous" 
                        alt="Raw Imagery" 
                      />
                    </div>

                    {/* Right: Difference Mask with Color Ramp Legend */}
                    <div className='flex-1 relative bg-black'>
                      <div className='absolute top-2 left-2 bg-black/85 px-2 py-0.5 text-[9px] font-mono text-white z-10 flex items-center gap-1.5 border border-white/20'>
                        <span className='font-bold text-cyan-300'>HYDROLOGICAL DIFFERENCE</span>
                        <span className='text-[8px] opacity-80 font-mono'>(&gt;{config.ndwiThreshold.toFixed(2)})</span>
                      </div>
                      
                      <img 
                        src={sceneData.yearB.trueColor} 
                        className="w-full h-full object-cover opacity-25 grayscale" 
                        crossOrigin="anonymous" 
                        alt="Base Imagery" 
                      />
                      {diffMap && (
                        <img 
                          src={diffMap} 
                          className="w-full h-full object-cover absolute top-0 left-0" 
                          crossOrigin="anonymous" 
                          alt="Difference Mask" 
                        />
                      )}
                      
                      {/* Difference Mask Key */}
                      <div className='absolute bottom-2 left-2 flex flex-col gap-1 text-[8px] font-mono bg-black/90 p-2 text-white border border-white/20 backdrop-blur-xs'>
                        <div className='flex items-center gap-1.5'>
                          <div className='w-2.5 h-2.5 bg-[#3B82F6] border border-white/30'></div> 
                          <span>Water Gained (Inundation)</span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <div className='w-2.5 h-2.5 bg-[#EF4444] border border-white/30'></div> 
                          <span>Water Lost (Desiccation)</span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <div className='w-2.5 h-2.5 bg-[#1E3A8A] border border-white/30'></div> 
                          <span>Unchanged Water Extent</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : mapView === 'ndwi_a' || mapView === 'ndwi_b' ? (
                  <div className='w-full h-full relative'>
                    <img 
                      src={
                        mapView === 'ndwi_a' 
                          ? (sceneData.yearA.colorizedNdwi || sceneData.yearA.ndwi) 
                          : (sceneData.yearB.colorizedNdwi || sceneData.yearB.ndwi)
                      }
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      alt="NDWI Raster"
                    />
                    <div className='absolute top-2 left-2 bg-black/85 text-white px-2 py-0.5 text-[9px] font-mono border border-white/20'>
                      <span>{mapView === 'ndwi_a' ? `${config.years[0]} NDWI` : `${config.years[1]} NDWI`} • {COLOR_RAMPS[colorRamp].name} Ramp</span>
                    </div>
                  </div>
                ) : (
                  <div className='w-full h-full relative'>
                    <img 
                      src={mapView === 'yearA' ? sceneData.yearA.trueColor : sceneData.yearB.trueColor}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      alt="Satellite Imagery"
                    />
                    <div className='absolute top-2 left-2 bg-black/85 text-white px-2 py-0.5 text-[9px] font-mono border border-white/20'>
                      <span>{mapView === 'yearA' ? `${config.years[0]} True Color` : `${config.years[1]} True Color`}</span>
                    </div>
                  </div>
                )
              ) : (
                <div 
                  className='absolute inset-0 flex flex-col items-center justify-center p-6 text-center' 
                  style={{ 
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', 
                    backgroundSize: '24px 24px' 
                  }}
                >
                  {currentStep === 'processing' ? (
                    <div className='flex flex-col items-center gap-3'>
                      <Cpu className="w-10 h-10 text-cyan-400 animate-pulse" />
                      <div className='text-xs font-mono text-white/80 tracking-wider'>
                        INGESTING SENTINEL-2 BANDS (B03 &amp; B08)...
                      </div>
                      <div className='text-[10px] font-mono text-white/50'>
                        Executing Spectral Masking and {COLOR_RAMPS[colorRamp].name} Color Mapping
                      </div>
                    </div>
                  ) : (
                    <div className='flex flex-col items-center gap-2 max-w-xs'>
                      <Compass className="w-8 h-8 text-white/30" />
                      <div className='text-xs font-mono text-white/70 uppercase tracking-wider font-bold'>
                        Observatory Ready
                      </div>
                      <div className='text-[10px] font-mono text-white/40 leading-relaxed'>
                        Select bounding box and click &ldquo;Initialize Pipeline Run&rdquo; to fetch high-resolution Sentinel-2 STAC rasters.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Floating NDWI Colormap Legend Needle Bar */}
          {currentStep === 'results' && sceneData && (
            <div className='p-3 border-t border-white/10 bg-[#141414]/95 flex flex-col gap-1'>
              <NdwiScaleLegend 
                selectedRamp={colorRamp} 
                threshold={config.ndwiThreshold} 
              />
            </div>
          )}
        </div>

        {/* Right Quantification & Analysis Panel */}
        <aside className='w-full lg:col-span-3 border-t lg:border-t-0 lg:border-l border-[#141414] flex flex-col bg-[#DFDCD7] order-3 lg:order-none overflow-y-auto max-h-none lg:max-h-full'>
          <div className='p-4 flex-1 flex flex-col overflow-y-auto space-y-4'>
            <div className='text-[10px] font-mono font-bold uppercase tracking-wider text-[#141414]/70 border-b border-[#141414]/20 pb-1 flex items-center justify-between'>
              <span>Hydrological Quantification</span>
              {isRecalculatingThreshold && (
                <span className='text-[9px] font-mono text-blue-800 animate-pulse font-bold'>RECALCULATING...</span>
              )}
            </div>
            
            {currentStep === 'results' && sceneData ? (
              <div className='space-y-4 font-mono text-[11px] bg-white p-3 border border-[#141414] shadow-xs'>
                
                {/* Dynamic Real-Time NDWI Threshold Slider */}
                <div className='p-2.5 bg-[#f5f4f0] border border-[#141414]/30 space-y-2'>
                  <div className='flex items-center justify-between text-[10px]'>
                    <span className='font-bold uppercase flex items-center gap-1.5'>
                      <Sliders className="w-3 h-3 text-blue-800" />
                      NDWI Threshold Cutoff
                    </span>
                    <span className='bg-blue-800 text-white px-2 py-0.5 text-[10px] font-bold'>
                      &gt; {config.ndwiThreshold.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-0.30"
                    max="0.70"
                    step="0.01"
                    value={config.ndwiThreshold}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setConfig(prev => ({ ...prev, ndwiThreshold: val }));
                      applyNdwiThresholdAndRamp(val, colorRamp);
                    }}
                    className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-800"
                  />
                  <div className='flex justify-between items-center text-[8px] opacity-70'>
                    <span>-0.30 (Wet Flora)</span>
                    <div className='flex gap-1'>
                      {[-0.05, 0.10, 0.20, 0.35].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setConfig(prev => ({ ...prev, ndwiThreshold: val }));
                            applyNdwiThresholdAndRamp(val, colorRamp);
                          }}
                          className={`px-1.5 py-0.2 border text-[8px] font-bold transition-colors ${
                            Math.abs(config.ndwiThreshold - val) < 0.005
                              ? 'bg-blue-800 text-white border-blue-800'
                              : 'bg-white border-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                        </button>
                      ))}
                    </div>
                    <span>0.70 (Deep Water)</span>
                  </div>
                </div>

                {/* Metrics Table */}
                <div className='space-y-2 text-[11px]'>
                  <div className='flex justify-between py-1 border-b border-black/10'>
                    <span className='opacity-70'>{config.years[0]} WATER EXTENT (T0)</span>
                    <span className='font-bold'>{sceneData.yearA.area.toFixed(2)} km²</span>
                  </div>
                  <div className='flex justify-between py-1 border-b border-black/10'>
                    <span className='opacity-70'>{config.years[1]} WATER EXTENT (T1)</span>
                    <span className='font-bold'>{sceneData.yearB.area.toFixed(2)} km²</span>
                  </div>
                  <div className='flex justify-between py-1 border-b border-black/10'>
                    <span className='font-bold'>ABSOLUTE CHANGE</span>
                    <span className={`font-bold ${change < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {change > 0 ? '+' : ''}{change.toFixed(2)} km²
                    </span>
                  </div>
                  <div className='flex justify-between py-1'>
                    <span className='font-bold'>RELATIVE CHANGE</span>
                    <span className={`font-bold ${pctChange < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                {/* Multi-Year Longitudinal Trend */}
                <div className='pt-2 border-t border-dashed border-gray-300'>
                  <div className='text-[9px] uppercase font-bold opacity-60 mb-2 flex justify-between items-center'>
                    <span>Longitudinal Trend ({config.years[0]}-{config.years[1]})</span>
                    <span className='text-[8px] bg-black/10 px-1 font-normal'>ANNUAL STAC</span>
                  </div>
                  <div className='h-32 w-full'>
                    {trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <XAxis dataKey="year" tick={{ fontSize: 8, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 8, fontFamily: 'monospace' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip 
                            contentStyle={{ fontSize: '10px', fontFamily: 'monospace', borderRadius: '0px', border: '1px solid #141414', backgroundColor: '#fff', color: '#000' }} 
                            formatter={(value: number) => [`${value.toFixed(2)} km²`, 'Water Area']}
                          />
                          <Line type="monotone" dataKey="area" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#141414', stroke: '#2563eb' }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className='w-full h-full flex items-center justify-center text-[9px] opacity-50'>Generating trend...</div>
                    )}
                  </div>
                </div>

                {/* Cloud Warning if applicable */}
                {(sceneData.yearA.cloudCover > 15 || sceneData.yearB.cloudCover > 15) && (
                  <div className='bg-yellow-50 border border-yellow-400 text-yellow-900 p-2 text-[9px] flex items-start gap-1.5'>
                    <AlertTriangle className='w-3.5 h-3.5 flex-shrink-0 text-amber-600 mt-0.5' />
                    <div>
                      <div className='font-bold uppercase'>Cloud Occlusion Advisory</div>
                      <div>Scene cloud cover is {Math.max(sceneData.yearA.cloudCover, sceneData.yearB.cloudCover).toFixed(1)}%. Consider tightening cloud filter.</div>
                    </div>
                  </div>
                )}

                {/* AI Ecological Synthesis Component */}
                <AiEcologicalInsights
                  sceneData={sceneData}
                  config={config}
                  change={change}
                  pctChange={pctChange}
                />
              </div>
            ) : (
              <div className='bg-white/40 border border-[#141414]/20 p-5 text-[10px] font-mono text-center opacity-60'>
                Execute pipeline to produce pixel quantification &amp; ecological insights.
              </div>
            )}
            
            {/* Provenance Export Button */}
            <button
              onClick={handleExport}
              disabled={currentStep !== 'results'}
              className="w-full bg-white border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] text-[#141414] font-mono text-[10px] font-bold uppercase py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-30 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export GeoJSON &amp; Provenance JSON
            </button>
            
            {error && (
              <div className="border border-red-900 bg-red-100 p-3 text-red-900 text-[10px] font-mono">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-700" />
                  <div>
                    <div className="font-bold mb-0.5">PIPELINE FAULT</div>
                    {error}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Cartographic Trace Log Footer */}
      <footer className="h-auto lg:h-20 border-t border-[#141414] flex flex-col lg:flex-row items-start px-6 bg-[#D0CDC7] gap-3 lg:gap-8 flex-shrink-0 py-2 lg:py-0 order-4 lg:order-none">
        <div className="flex-1 overflow-y-auto h-16 lg:h-full w-full py-1.5">
          <div className="text-[9px] font-mono uppercase font-bold opacity-60 mb-0.5 flex items-center justify-between">
            <span>Trace Log</span>
            <span className="text-[8px] opacity-60">Sentinel-2 STAC • B03/B08</span>
          </div>
          <div className="text-[9px] font-mono leading-tight space-y-0.5 opacity-80">
            {logs.length === 0 && (
              <div className="opacity-50">Awaiting pipeline execution...</div>
            )}
            {logs.map((log, i) => (
              <div 
                key={i} 
                className={
                  log.includes('ERROR') 
                    ? 'text-red-800 font-bold' 
                    : log.includes('RETRY-ON-FAILURE') 
                    ? 'text-amber-800 font-bold' 
                    : log.includes('COMPUTE')
                    ? 'text-blue-900'
                    : ''
                }
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
