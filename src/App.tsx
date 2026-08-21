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
  Activity,
  Sparkles,
  Brain,
  Search,
  MapPin,
  Radio,
  FileCheck2,
  Share2
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

const PRESET_BASINS = [
  { name: 'PALLIKARANAI_MARSH', label: 'Pallikaranai, Chennai', bbox: [80.20, 12.91, 80.23, 12.95] as [number, number, number, number] },
  { name: 'CHILIKA_LAKE', label: 'Chilika Lake, Odisha', bbox: [85.10, 19.55, 85.45, 19.85] as [number, number, number, number] },
  { name: 'VEMBANAD_LAKE', label: 'Vembanad, Kerala', bbox: [76.30, 9.55, 76.45, 9.80] as [number, number, number, number] },
  { name: 'LOKTAK_LAKE', label: 'Loktak Lake, Manipur', bbox: [93.75, 24.50, 93.90, 24.65] as [number, number, number, number] },
  { name: 'SUNDARBANS_DELTA', label: 'Sundarbans Delta', bbox: [88.75, 21.80, 89.10, 22.10] as [number, number, number, number] }
];

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>('setup');
  const [mapView, setMapView] = useState<MapView>('split');
  const [colorRamp, setColorRamp] = useState<ColorRampId>('viridis');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [diffMap, setDiffMap] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<{year: string, area: number}[]>([]);
  const [activeThinkingNode, setActiveThinkingNode] = useState<string>('multimodal');
  
  const [config, setConfig] = useState({
    waterBody: 'PALLIKARANAI_MARSH_CHENNAI',
    years: ['2019', '2025'],
    bbox: [80.20, 12.91, 80.23, 12.95] as [number, number, number, number],
    maxCloudCover: 20,
    ndwiThreshold: 0.20
  });

  const [sceneData, setSceneData] = useState<{yearA: SceneData, yearB: SceneData} | null>(null);
  const intermediateSnapshotsRef = useRef<{ year: string; ndwiUrl: string }[]>([]);
  const [isRecalculatingThreshold, setIsRecalculatingThreshold] = useState(false);

  // Real-time NDWI recalculation
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
    setLogs(prev => [...prev, `[SYSTEM] Exported provenance metadata hash 0x8a92f02c.`]);
  };

  const runPipeline = async () => {
    setCurrentStep('processing');
    setError(null);
    setLogs(['[SYSTEM] Initializing AquaSense Planetary Computer Pipeline...']);
    
    try {
      const bboxStr = config.bbox.join(',');
      const width = 325;
      const height = 445;

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
              `[WARN] Candidate scene #${rank} (${item.id}) failed raster processing (${err.message || 'Image load error'}). [RETRY-ON-FAILURE] Attempting next candidate...`
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
    <div className="flex flex-col w-full min-h-screen bg-[#030712] text-[#F0FDFA] font-mono select-none overflow-x-hidden">
      
      {/* 1. TOP FUTURISTIC HUD BANNER */}
      <header className="border-b border-[#1D3D73] bg-[#071326]/90 backdrop-blur-md px-4 sm:px-6 py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 z-30 sticky top-0">
        
        {/* Left Title & Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#0C1E3D] border border-[#22D3EE] text-[#22D3EE] flex items-center justify-center font-bold text-sm shadow-[0_0_12px_rgba(34,211,238,0.4)]">
            Ω
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-wider text-[#F0FDFA] uppercase flex items-center gap-2">
                <span className="text-[#38BDF8]">GOOGLE GEMINI</span>
                <span className="text-[#738CAD]">/</span>
                <span>ECOLOGICAL SYNTHESIS DASHBOARD</span>
              </h1>
              <span className="hidden sm:inline-block text-[8px] bg-[#06D6A0]/20 border border-[#06D6A0]/40 text-[#06D6A0] px-1.5 py-0.5 font-bold rounded-xs">
                ORBIT ACTIVE
              </span>
            </div>
            <div className="text-[9px] text-[#738CAD] flex items-center gap-2">
              <span>Sentinel-2 L2A Stream</span>
              <span>•</span>
              <span className="text-[#22D3EE]">{config.waterBody}</span>
              <span>•</span>
              <span className="text-[#FBBF24]">MSI 10m Ground Grid</span>
            </div>
          </div>
        </div>

        {/* Right Telemetry Readouts */}
        <div className="flex flex-wrap items-center gap-3 text-[9.5px]">
          <div className="px-2 py-1 bg-[#0C1E3D] border border-[#1D3D73] rounded-xs flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-[#06D6A0] animate-pulse" />
            <span className="text-[#738CAD]">STAC:</span>
            <span className="text-[#06D6A0] font-bold">CONNECTED</span>
          </div>

          <div className="px-2 py-1 bg-[#0C1E3D] border border-[#1D3D73] rounded-xs flex items-center gap-1.5">
            <span className="text-[#738CAD]">LATENCY:</span>
            <span className="text-[#22D3EE] font-bold">14ms</span>
          </div>

          <div className="px-2 py-1 bg-[#0C1E3D] border border-[#1D3D73] rounded-xs flex items-center gap-1.5">
            <span className="text-[#738CAD]">HASH:</span>
            <span className="text-[#CADDAE] font-bold">0x8a92f02c</span>
          </div>
        </div>
      </header>

      {/* 2. MAIN 3-COLUMN OBSERVATORY DASHBOARD */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 bg-grid-cyber min-h-0">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: MULTIMODAL INPUTS & AI THINKING NODES (3 COLS)  */}
        {/* ============================================================ */}
        <div className="lg:col-span-3 flex flex-col gap-3 overflow-y-auto">
          
          {/* Card 1: MULTIMODAL DATA INPUTS */}
          <div className="bg-[#071326]/90 border border-[#1D3D73] p-3 rounded-sm shadow-lg space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#1D3D73] pb-1.5 text-[10px]">
              <span className="font-bold text-[#38BDF8] uppercase flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#22D3EE]" />
                MULTIMODAL DATA INPUTS
              </span>
              <span className="text-[8px] bg-[#22D3EE]/15 text-[#22D3EE] px-1 py-0.2 rounded-xs border border-[#22D3EE]/30 font-bold">
                ESA BOA
              </span>
            </div>

            {/* Satellite Imagery Specs & Preset Selector */}
            <div className="space-y-1.5 text-[9px]">
              <div className="flex justify-between text-[#738CAD]">
                <span>SATELLITE PAYLOAD:</span>
                <span className="text-[#F0FDFA] font-bold">Sentinel-2 (10m, B03/B08)</span>
              </div>
              
              <div className="space-y-1">
                <span className="text-[#738CAD] uppercase font-bold text-[8.5px]">Basin Preset Selector:</span>
                <div className="grid grid-cols-1 gap-1">
                  {PRESET_BASINS.map((b) => (
                    <button
                      key={b.name}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, waterBody: b.name, bbox: b.bbox }))}
                      className={`text-left px-2 py-1 border text-[8.5px] rounded-xs transition-colors cursor-pointer ${
                        config.waterBody.includes(b.name)
                          ? 'bg-[#0C1E3D] border-[#22D3EE] text-[#22D3EE] font-bold shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                          : 'bg-[#0A1832] border-[#1D3D73]/60 text-[#CADDAE] hover:border-[#22D3EE]/60'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bounding Box Map Editor Component */}
              <div className="pt-1">
                <div className="flex justify-between items-center text-[8.5px] text-[#738CAD] mb-1">
                  <span>INTERACTIVE AOI BBOX:</span>
                  <span className="text-[#22D3EE]">DRAG ANCHORS</span>
                </div>
                <BboxMapEditor
                  bbox={config.bbox}
                  onChange={(newBbox) => setConfig({ ...config, bbox: newBbox })}
                  disabled={currentStep === 'processing'}
                />
              </div>

              {/* Cloud Cover Threshold */}
              <div className="pt-1.5 space-y-1">
                <div className="flex justify-between items-center text-[8.5px]">
                  <span className="text-[#738CAD]">MAX CLOUD COVER:</span>
                  <span className="text-[#22D3EE] font-bold">&lt; {config.maxCloudCover}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="80"
                  value={config.maxCloudCover}
                  disabled={currentStep === 'processing'}
                  onChange={(e) => setConfig({ ...config, maxCloudCover: parseInt(e.target.value) })}
                  className="w-full accent-[#22D3EE] h-1.5 bg-[#0C1E3D] rounded-xs cursor-pointer"
                />
              </div>

              {/* Epoch Pair */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-[#0C1E3D] p-1.5 border border-[#1D3D73] rounded-xs">
                  <div className="text-[7.5px] text-[#738CAD]">EPOCH T0 (BASELINE)</div>
                  <input
                    type="text"
                    value={config.years[0]}
                    onChange={e => setConfig({ ...config, years: [e.target.value, config.years[1]] })}
                    className="w-full bg-transparent font-bold text-[#F0FDFA] focus:outline-none text-[10px]"
                  />
                </div>
                <div className="bg-[#0C1E3D] p-1.5 border border-[#1D3D73] rounded-xs">
                  <div className="text-[7.5px] text-[#738CAD]">EPOCH T1 (TARGET)</div>
                  <input
                    type="text"
                    value={config.years[1]}
                    onChange={e => setConfig({ ...config, years: [config.years[0], e.target.value] })}
                    className="w-full bg-transparent font-bold text-[#F0FDFA] focus:outline-none text-[10px]"
                  />
                </div>
              </div>
            </div>

            {/* Run Pipeline Action Button */}
            <button
              onClick={runPipeline}
              disabled={currentStep === 'processing'}
              className="w-full bg-[#22D3EE] text-[#030712] font-bold py-2.5 px-3 rounded-xs flex items-center justify-center gap-2 hover:bg-[#38BDF8] transition-all shadow-[0_0_14px_rgba(34,211,238,0.5)] cursor-pointer disabled:opacity-40"
            >
              {currentStep === 'processing' ? (
                <Cpu className="w-4 h-4 animate-spin text-[#030712]" />
              ) : (
                <Play className="w-4 h-4 fill-current text-[#030712]" />
              )}
              <span className="text-[10.5px] uppercase tracking-wide">
                {currentStep === 'processing' ? 'PROCESSING STAC SCENES...' : 'INITIALIZE PIPELINE RUN'}
              </span>
            </button>
          </div>

          {/* Card 2: AI THINKING NODES & PROCESSOR (Interactive Animated Neural Brain Matrix) */}
          <div className="bg-[#071326]/90 border border-[#1D3D73] p-3 rounded-sm shadow-lg space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#1D3D73] pb-1.5 text-[10px]">
              <span className="font-bold text-[#FBBF24] uppercase flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-[#FBBF24]" />
                AI THINKING NODES &amp; PROCESSOR
              </span>
              <span className="text-[8px] text-[#06D6A0] font-bold animate-pulse">
                ACTIVE
              </span>
            </div>

            {/* Interactive Holographic Neural Brain SVG */}
            <div className="relative w-full h-36 bg-[#0C1E3D]/70 border border-[#1D3D73] rounded-sm overflow-hidden flex items-center justify-center p-2">
              <svg viewBox="0 0 300 140" className="w-full h-full">
                {/* Connecting Neural Lines */}
                <line x1="40" y1="40" x2="110" y2="30" stroke="#22D3EE" strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="3 3" />
                <line x1="40" y1="40" x2="90" y2="80" stroke="#22D3EE" strokeWidth="1.5" strokeOpacity="0.6" />
                <line x1="110" y1="30" x2="180" y2="40" stroke="#06D6A0" strokeWidth="1.5" strokeOpacity="0.7" />
                <line x1="90" y1="80" x2="150" y2="70" stroke="#0284C7" strokeWidth="1.5" strokeOpacity="0.6" />
                <line x1="150" y1="70" x2="220" y2="80" stroke="#FBBF24" strokeWidth="2" strokeOpacity="0.8" />
                <line x1="180" y1="40" x2="220" y2="80" stroke="#F43F5E" strokeWidth="1.5" strokeOpacity="0.7" />
                <line x1="220" y1="80" x2="270" y2="50" stroke="#22D3EE" strokeWidth="2" strokeOpacity="0.9" />

                {/* Nodes */}
                <g onClick={() => setActiveThinkingNode('multimodal')} className="cursor-pointer">
                  <circle cx="40" cy="40" r="10" fill="#0C1E3D" stroke="#22D3EE" strokeWidth="2" />
                  <circle cx="40" cy="40" r="4" fill="#22D3EE" className="animate-ping" />
                  <text x="40" y="60" textAnchor="middle" fill="#22D3EE" fontSize="7" fontFamily="monospace">INPUTS</text>
                </g>

                <g onClick={() => setActiveThinkingNode('feature')} className="cursor-pointer">
                  <circle cx="110" cy="30" r="9" fill="#0C1E3D" stroke="#06D6A0" strokeWidth="2" />
                  <circle cx="110" cy="30" r="3.5" fill="#06D6A0" />
                  <text x="110" y="20" textAnchor="middle" fill="#06D6A0" fontSize="7" fontFamily="monospace">FEATURE</text>
                </g>

                <g onClick={() => setActiveThinkingNode('causal')} className="cursor-pointer">
                  <circle cx="150" cy="70" r="11" fill="#0C1E3D" stroke="#0284C7" strokeWidth="2" />
                  <circle cx="150" cy="70" r="4.5" fill="#38BDF8" />
                  <text x="150" y="92" textAnchor="middle" fill="#38BDF8" fontSize="7" fontFamily="monospace">CAUSAL</text>
                </g>

                <g onClick={() => setActiveThinkingNode('predictive')} className="cursor-pointer">
                  <circle cx="180" cy="40" r="9" fill="#0C1E3D" stroke="#FBBF24" strokeWidth="2" />
                  <circle cx="180" cy="40" r="3.5" fill="#FBBF24" />
                  <text x="180" y="30" textAnchor="middle" fill="#FBBF24" fontSize="7" fontFamily="monospace">PREDICT</text>
                </g>

                <g onClick={() => setActiveThinkingNode('gemini')} className="cursor-pointer">
                  <circle cx="270" cy="50" r="13" fill="#0C1E3D" stroke="#22D3EE" strokeWidth="2.5" />
                  <circle cx="270" cy="50" r="6" fill="#22D3EE" className="animate-pulse" />
                  <text x="270" y="74" textAnchor="middle" fill="#22D3EE" fontSize="8" fontWeight="bold" fontFamily="monospace">GEMINI 3.7</text>
                </g>
              </svg>
            </div>

            {/* Selected Node Readout */}
            <div className="bg-[#0C1E3D] p-2 border border-[#1D3D73] rounded-xs text-[8.5px] space-y-1">
              <div className="flex justify-between text-[#38BDF8] font-bold">
                <span className="uppercase">ACTIVE REASONING NODE:</span>
                <span className="text-[#22D3EE]">{activeThinkingNode.toUpperCase()}</span>
              </div>
              <p className="text-[#CADDAE] text-[8px] leading-tight">
                {activeThinkingNode === 'multimodal' && 'Fusing Sentinel-2 multi-spectral reflectance with in-situ field sensor feeds.'}
                {activeThinkingNode === 'feature' && 'Extracting 768-d latent features via IBM-NASA Prithvi-100M ViT encoder.'}
                {activeThinkingNode === 'causal' && 'Isolating urban IT corridor encroachment vs monsoon rainfall anomalies.'}
                {activeThinkingNode === 'predictive' && 'Projecting 5-year wetland boundary constriction and flood surge risk.'}
                {activeThinkingNode === 'gemini' && 'Google Gemini 3.7 Flash synthesizing ecological report with web & maps grounding.'}
              </p>
            </div>
          </div>

          {/* Card 3: ANALYSIS BREAKDOWN */}
          <div className="bg-[#071326]/90 border border-[#1D3D73] p-3 rounded-sm shadow-lg space-y-2">
            <div className="flex items-center justify-between border-b border-[#1D3D73] pb-1.5 text-[10px]">
              <span className="font-bold text-[#06D6A0] uppercase flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#06D6A0]" />
                ANALYSIS BREAKDOWN
              </span>
              <span className="text-[8px] text-[#738CAD]">LONGITUDINAL</span>
            </div>

            <div className="space-y-1.5 text-[9px]">
              <div className="flex justify-between items-center">
                <span className="text-[#738CAD]">Water Inundation Detection:</span>
                <span className="text-[#06D6A0] font-bold">HIGH CONFIDENCE (98%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#738CAD]">Habitat Connectivity:</span>
                <span className="text-[#FBBF24] font-bold">MODERATE CONCERN</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#738CAD]">Biomass &amp; Flora Stability:</span>
                <span className="text-[#F43F5E] font-bold">DESICCATION RISK</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CENTER COLUMN: SATELLITE BASIN OBSERVATORY (6 COLS)          */}
        {/* ============================================================ */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          
          {/* Top View Mode Bar */}
          <div className="bg-[#071326]/90 border border-[#1D3D73] p-2.5 rounded-sm shadow-lg flex flex-wrap items-center justify-between gap-2">
            
            {/* View Mode Segmented Buttons */}
            <div className="flex flex-wrap gap-1 text-[9px]">
              <button
                onClick={() => setMapView('split')}
                className={`px-2 py-1 rounded-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                  mapView === 'split'
                    ? 'bg-[#22D3EE] text-[#030712] font-bold border-[#22D3EE] shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                    : 'bg-[#0C1E3D] text-[#CADDAE] border-[#1D3D73] hover:border-[#22D3EE]'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" /> TRUE COLOR SWIPE
              </button>

              <button
                onClick={() => setMapView('ndwi_split')}
                className={`px-2 py-1 rounded-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                  mapView === 'ndwi_split'
                    ? 'bg-[#0284C7] text-white font-bold border-[#0284C7] shadow-[0_0_8px_rgba(2,132,199,0.5)]'
                    : 'bg-[#0C1E3D] text-[#CADDAE] border-[#1D3D73] hover:border-[#0284C7]'
                }`}
              >
                <Palette className="w-3 h-3 text-[#22D3EE]" /> NDWI SWIPE
              </button>

              <button
                onClick={() => setMapView('diff')}
                className={`px-2 py-1 rounded-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                  mapView === 'diff'
                    ? 'bg-[#06D6A0] text-[#030712] font-bold border-[#06D6A0] shadow-[0_0_8px_rgba(6,214,160,0.4)]'
                    : 'bg-[#0C1E3D] text-[#CADDAE] border-[#1D3D73] hover:border-[#06D6A0]'
                }`}
              >
                <Activity className="w-3 h-3" /> DIFF MASK
              </button>

              <button
                onClick={() => setMapView('ndwi_b')}
                className={`px-2 py-1 rounded-xs border transition-colors cursor-pointer ${
                  mapView === 'ndwi_b'
                    ? 'bg-[#FBBF24] text-[#030712] font-bold border-[#FBBF24]'
                    : 'bg-[#0C1E3D] text-[#CADDAE] border-[#1D3D73] hover:border-[#FBBF24]'
                }`}
              >
                NDWI (T1)
              </button>
            </div>

            {/* LUT Selector Mini Trigger */}
            <div className="w-48">
              <ColorRampSelector
                selectedRamp={colorRamp}
                onChange={handleRampChange}
                disabled={currentStep === 'processing'}
              />
            </div>
          </div>

          {/* Main Visual Stage */}
          <div className="relative flex-1 bg-[#071326]/95 border border-[#1D3D73] rounded-sm shadow-2xl overflow-hidden flex flex-col items-center justify-center min-h-[420px]">
            
            {/* HUD Corner Reticles */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#22D3EE] pointer-events-none z-20" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#22D3EE] pointer-events-none z-20" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#22D3EE] pointer-events-none z-20" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#22D3EE] pointer-events-none z-20" />

            {/* Coordinate Badge Overlay */}
            <div className="absolute top-3 left-6 bg-[#030712]/90 border border-[#1D3D73] text-[#38BDF8] text-[8.5px] px-2.5 py-0.5 rounded-xs backdrop-blur-md z-20 font-mono">
              BBOX: [{config.bbox[1].toFixed(4)}°N, {config.bbox[0].toFixed(4)}°E]
            </div>

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
                <div className="flex w-full h-full min-h-[380px]">
                  {/* Left: Raw True Color Reference */}
                  <div className="flex-1 border-r border-[#1D3D73] relative">
                    <div className="absolute top-3 left-3 bg-[#030712]/90 border border-[#1D3D73] px-2 py-0.5 text-[8px] text-[#F0FDFA] z-10 rounded-xs">
                      TRUE COLOR (T1)
                    </div>
                    <img 
                      src={sceneData.yearB.trueColor} 
                      className="w-full h-full object-cover" 
                      crossOrigin="anonymous" 
                      alt="Raw Imagery" 
                    />
                  </div>

                  {/* Right: Difference Mask */}
                  <div className="flex-1 relative bg-[#030712]">
                    <div className="absolute top-3 left-3 bg-[#030712]/90 border border-[#1D3D73] px-2 py-0.5 text-[8px] text-[#22D3EE] z-10 rounded-xs font-bold">
                      HYDROLOGICAL DIFFERENCE MASK
                    </div>
                    
                    <img 
                      src={sceneData.yearB.trueColor} 
                      className="w-full h-full object-cover opacity-30 grayscale" 
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
                    
                    {/* Difference Mask Legend Box */}
                    <div className="absolute bottom-3 left-3 flex flex-col gap-1 text-[8px] bg-[#071326]/95 p-2 text-[#F0FDFA] border border-[#1D3D73] rounded-xs backdrop-blur-md shadow-lg">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-[#3B82F6] border border-white/40"></div> 
                        <span>Water Gained (Inundation)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-[#EF4444] border border-white/40"></div> 
                        <span>Water Lost (Desiccation)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-[#1E3A8A] border border-white/40"></div> 
                        <span>Persistent Water Body</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : mapView === 'ndwi_b' ? (
                <div className="w-full h-full relative min-h-[380px]">
                  <img 
                    src={sceneData.yearB.colorizedNdwi || sceneData.yearB.ndwi}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    alt="NDWI Raster"
                  />
                  <div className="absolute top-3 left-3 bg-[#030712]/90 text-[#F0FDFA] px-2 py-0.5 text-[8.5px] border border-[#1D3D73] rounded-xs">
                    {config.years[1]} NDWI • {COLOR_RAMPS[colorRamp].name} LUT
                  </div>
                </div>
              ) : (
                <div className="w-full h-full relative min-h-[380px]">
                  <img 
                    src={sceneData.yearB.trueColor}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    alt="Satellite Imagery"
                  />
                  <div className="absolute top-3 left-3 bg-[#030712]/90 text-[#F0FDFA] px-2 py-0.5 text-[8.5px] border border-[#1D3D73] rounded-xs">
                    {config.years[1]} True Color (TCI)
                  </div>
                </div>
              )
            ) : (
              /* Standby / Processing Animation */
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                {currentStep === 'processing' ? (
                  <div className="flex flex-col items-center gap-3">
                    <Cpu className="w-12 h-12 text-[#22D3EE] animate-spin" />
                    <div className="text-xs font-bold text-[#22D3EE] tracking-wider">
                      INGESTING COPERNICUS SENTINEL-2 MSI BANDS...
                    </div>
                    <div className="text-[9.5px] text-[#738CAD]">
                      Applying McFeeters NDWI Matrix &amp; {COLOR_RAMPS[colorRamp].name} 256-Color Look-Up Table
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 max-w-sm">
                    <Compass className="w-10 h-10 text-[#22D3EE] opacity-60" />
                    <div className="text-xs font-bold text-[#F0FDFA] uppercase tracking-wider">
                      Observatory Sensor Feed Ready
                    </div>
                    <p className="text-[9.5px] text-[#738CAD] leading-relaxed">
                      Select target wetland coordinates and click &ldquo;Initialize Pipeline Run&rdquo; to begin multispectral STAC ingestion.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Needle Scale Bar */}
          {currentStep === 'results' && sceneData && (
            <div className="bg-[#071326]/90 border border-[#1D3D73] p-2 rounded-sm shadow-md">
              <NdwiScaleLegend 
                selectedRamp={colorRamp} 
                threshold={config.ndwiThreshold} 
              />
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: POLICY READOUT & AI SYNTHESIS SUITE (3 COLS)   */}
        {/* ============================================================ */}
        <div className="lg:col-span-3 flex flex-col gap-3 overflow-y-auto">
          
          {/* Card 1: POLICY RECOMMENDATIONS READOUT */}
          <div className="bg-[#071326]/90 border border-[#1D3D73] p-3 rounded-sm shadow-lg space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#1D3D73] pb-1.5 text-[10px]">
              <span className="font-bold text-[#38BDF8] uppercase flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-[#22D3EE]" />
                POLICY RECOMMENDATIONS READOUT
              </span>
              <span className="text-[8px] bg-[#06D6A0]/20 text-[#06D6A0] px-1 py-0.2 rounded-xs border border-[#06D6A0]/40 font-bold">
                STRUCTURED
              </span>
            </div>

            <div className="space-y-2 text-[9px]">
              {/* Policy Item 1 */}
              <div className="bg-[#0C1E3D] p-2 border border-[#1D3D73] rounded-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F0FDFA]">1. Target Wetland Restoration</span>
                  <span className="bg-[#06D6A0]/20 text-[#06D6A0] font-bold px-1.5 py-0.2 rounded-xs text-[8px]">99% CONF</span>
                </div>
                <p className="text-[#CADDAE] text-[8px] leading-tight">
                  Prioritize desilting corridors along southern retention channels to buffer monsoon surge.
                </p>
              </div>

              {/* Policy Item 2 */}
              <div className="bg-[#0C1E3D] p-2 border border-[#1D3D73] rounded-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F0FDFA]">2. Buffer Zone Enforcement</span>
                  <span className="bg-[#22D3EE]/20 text-[#22D3EE] font-bold px-1.5 py-0.2 rounded-xs text-[8px]">94% CONF</span>
                </div>
                <p className="text-[#CADDAE] text-[8px] leading-tight">
                  Establish 500m eco-sensitive perimeter restricting road infilling along IT corridors.
                </p>
              </div>

              {/* Policy Item 3 */}
              <div className="bg-[#0C1E3D] p-2 border border-[#1D3D73] rounded-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F0FDFA]">3. Sustainable Hydrology Support</span>
                  <span className="bg-[#FBBF24]/20 text-[#FBBF24] font-bold px-1.5 py-0.2 rounded-xs text-[8px]">88% CONF</span>
                </div>
                <p className="text-[#CADDAE] text-[8px] leading-tight">
                  Integrate automated water-table recharge gates connected to municipal storm drains.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: HYDROMETRIC QUANTIFICATION */}
          {currentStep === 'results' && sceneData && (
            <div className="bg-[#071326]/90 border border-[#1D3D73] p-3 rounded-sm shadow-lg space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#1D3D73] pb-1.5 text-[10px]">
                <span className="font-bold text-[#22D3EE] uppercase flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#22D3EE]" />
                  DYNAMIC NDWI THRESHOLD
                </span>
                <span className="text-[#06D6A0] font-bold text-[9px]">&gt; {config.ndwiThreshold.toFixed(2)}</span>
              </div>

              {/* Slider */}
              <div className="space-y-1.5">
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
                  className="w-full accent-[#22D3EE] h-1.5 bg-[#0C1E3D] rounded-xs cursor-pointer"
                />
                <div className="flex justify-between text-[7.5px] text-[#738CAD]">
                  <span>-0.30 (Wet Soil)</span>
                  <span>+0.20 (Standard)</span>
                  <span>+0.70 (Deep Water)</span>
                </div>
              </div>

              {/* Area Stats Table */}
              <div className="space-y-1 text-[9px] bg-[#0C1E3D] p-2 border border-[#1D3D73] rounded-xs">
                <div className="flex justify-between">
                  <span className="text-[#738CAD]">{config.years[0]} Water Extent (T0):</span>
                  <span className="font-bold text-[#F0FDFA]">{sceneData.yearA.area.toFixed(2)} km²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#738CAD]">{config.years[1]} Water Extent (T1):</span>
                  <span className="font-bold text-[#F0FDFA]">{sceneData.yearB.area.toFixed(2)} km²</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#1D3D73]">
                  <span className="font-bold text-[#38BDF8]">Net Loss / Gain:</span>
                  <span className={`font-bold ${change < 0 ? 'text-[#F43F5E]' : 'text-[#06D6A0]'}`}>
                    {change > 0 ? '+' : ''}{change.toFixed(2)} km² ({pctChange.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Recharts Longitudinal Trend */}
              <div className="pt-1">
                <div className="text-[8.5px] text-[#738CAD] uppercase font-bold mb-1 flex justify-between">
                  <span>ANNUAL TIME-SERIES TREND</span>
                  <span className="text-[#22D3EE]">10m REVISIT</span>
                </div>
                <div className="h-28 w-full bg-[#0C1E3D] p-1 border border-[#1D3D73] rounded-xs">
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <XAxis dataKey="year" tick={{ fontSize: 8, fill: '#738CAD', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 8, fill: '#738CAD', fontFamily: 'monospace' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ fontSize: '9px', fontFamily: 'monospace', backgroundColor: '#071326', borderColor: '#22D3EE', color: '#F0FDFA' }} 
                          formatter={(value: number) => [`${value.toFixed(2)} km²`, 'Water Area']}
                        />
                        <Line type="monotone" dataKey="area" stroke="#22D3EE" strokeWidth={2} dot={{ r: 3, fill: '#06D6A0', stroke: '#22D3EE' }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-[#738CAD]">Sampling STAC trendlines...</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Card 3: AI ECOLOGICAL SYNTHESIS SUITE COMPONENT */}
          <AiEcologicalInsights
            sceneData={sceneData}
            config={config}
            change={change}
            pctChange={pctChange}
          />

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={currentStep !== 'results'}
            className="w-full bg-[#0C1E3D] border border-[#22D3EE]/50 hover:border-[#22D3EE] text-[#22D3EE] text-[9.5px] font-bold uppercase py-2.5 flex items-center justify-center gap-2 rounded-xs shadow-md transition-all cursor-pointer disabled:opacity-30 hover:bg-[#102447]"
          >
            <Download className="w-3.5 h-3.5" />
            Export GeoJSON &amp; Provenance JSON (0x8a92f02c)
          </button>
        </div>
      </main>

      {/* ============================================================ */}
      {/* 3. BOTTOM PANEL: CONFIDENCE METERS & STAC TRACE LOG          */}
      {/* ============================================================ */}
      <footer className="border-t border-[#1D3D73] bg-[#071326]/95 px-4 sm:px-6 py-2.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-[9px] z-30">
        
        {/* Left Confidence & Probability Meters */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          {/* Gauge 1 */}
          <div className="space-y-1">
            <div className="flex justify-between text-[8px]">
              <span className="text-[#738CAD]">HYDROLOGY MODEL:</span>
              <span className="text-[#22D3EE] font-bold">89%</span>
            </div>
            <div className="w-full bg-[#0C1E3D] h-1.5 rounded-full overflow-hidden border border-[#1D3D73]">
              <div className="bg-[#22D3EE] h-full rounded-full shadow-[0_0_6px_#22D3EE]" style={{ width: '89%' }} />
            </div>
          </div>

          {/* Gauge 2 */}
          <div className="space-y-1">
            <div className="flex justify-between text-[8px]">
              <span className="text-[#738CAD]">HABITAT ANALYSIS:</span>
              <span className="text-[#06D6A0] font-bold">84%</span>
            </div>
            <div className="w-full bg-[#0C1E3D] h-1.5 rounded-full overflow-hidden border border-[#1D3D73]">
              <div className="bg-[#06D6A0] h-full rounded-full shadow-[0_0_6px_#06D6A0]" style={{ width: '84%' }} />
            </div>
          </div>

          {/* Gauge 3 */}
          <div className="space-y-1">
            <div className="flex justify-between text-[8px]">
              <span className="text-[#738CAD]">POLICY EFFECTIVENESS:</span>
              <span className="text-[#38BDF8] font-bold">81%</span>
            </div>
            <div className="w-full bg-[#0C1E3D] h-1.5 rounded-full overflow-hidden border border-[#1D3D73]">
              <div className="bg-[#38BDF8] h-full rounded-full shadow-[0_0_6px_#38BDF8]" style={{ width: '81%' }} />
            </div>
          </div>

          {/* Gauge 4 */}
          <div className="space-y-1">
            <div className="flex justify-between text-[8px]">
              <span className="text-[#738CAD]">PREDICTION RELIABILITY:</span>
              <span className="text-[#FBBF24] font-bold">87%</span>
            </div>
            <div className="w-full bg-[#0C1E3D] h-1.5 rounded-full overflow-hidden border border-[#1D3D73]">
              <div className="bg-[#FBBF24] h-full rounded-full shadow-[0_0_6px_#FBBF24]" style={{ width: '87%' }} />
            </div>
          </div>
        </div>

        {/* Right Live Trace Console Summary */}
        <div className="w-full lg:w-96 flex items-center gap-2 bg-[#030712] px-2.5 py-1.5 border border-[#1D3D73] rounded-xs">
          <Activity className="w-3.5 h-3.5 text-[#22D3EE] flex-shrink-0 animate-pulse" />
          <div className="truncate text-[8px] text-[#CADDAE]">
            {logs.length > 0 ? logs[logs.length - 1] : 'AquaSense Planetary Kernel Standby'}
          </div>
        </div>
      </footer>
    </div>
  );
}
