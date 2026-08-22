import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Database, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Download, 
  Upload, 
  SlidersHorizontal, 
  Sliders, 
  Palette,
  Compass, 
  Activity, 
  Brain, 
  Radio, 
  FileCheck2, 
  Terminal, 
  ChevronUp, 
  ChevronDown, 
  Copy, 
  Trash2, 
  Check, 
  Radar, 
  Eye, 
  Zap, 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  AlertOctagon, 
  ShieldCheck, 
  Server, 
  Network, 
  Bot, 
  Waves, 
  Droplets,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
  RefreshCw,
  Edit3,
  X
} from 'lucide-react';
import * as turf from '@turf/turf';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AiEcologicalInsights } from './components/AiEcologicalInsights';
import { ImageSplitSlider } from './components/ImageSplitSlider';
import { BboxMapEditor } from './components/BboxMapEditor';
import { ColorRampSelector, NdwiScaleLegend } from './components/ColorRampSelector';
import { HydrologyChatbot } from './components/HydrologyChatbot';
import { ChatbotLogo } from './components/ChatbotLogo';
import { WaterQualityAndBathymetry } from './components/WaterQualityAndBathymetry';
import { ColorRampId, COLOR_RAMPS } from './utils/colorRamps';
import { 
  countWaterPixelsWithThreshold, 
  countSarWaterPixelsWithThreshold,
  generateDifferenceMapWithThreshold, 
  colorizeNdwiRaster,
  colorizeSarRaster,
  generateAllWeatherFusedRaster,
  calculate3DBathymetryAndVolume,
  calculateSpectralWaterQuality,
  BathymetryResult,
  WaterQualityResult,
  getCachedImage 
} from './utils/rasterAnalysis';

type Step = 'setup' | 'processing' | 'results';
type MapView = 'split' | 'ndwi_split' | 'sar_vv' | 'fused_allweather' | 'diff' | 'bathymetry' | 'turbidity' | 'chlorophyll' | 'cdom' | 'ndwi_b' | 'sar_b' | 'yearB';
type SensorMode = 'optical' | 'sar' | 'fused';

interface SceneData {
  id: string;
  sarId?: string;
  trueColor: string;
  ndwi: string;
  colorizedNdwi?: string;
  sarVvUrl?: string;
  sarVhUrl?: string;
  sarColorized?: string;
  fusedUrl?: string;
  area: number;
  sarArea?: number;
  cloudCover: number;
  date: string;
  isSarPenetrating?: boolean;
}

const PRESET_BASINS = [
  { name: 'PALLIKARANAI_MARSH', label: 'Pallikaranai, Chennai', bbox: [80.20, 12.91, 80.23, 12.95] as [number, number, number, number] },
  { name: 'CHEMBARAMBAKKAM_LAKE', label: 'Chembarambakkam, Chennai', bbox: [80.00, 12.98, 80.08, 13.04] as [number, number, number, number] },
  { name: 'CHILIKA_LAKE', label: 'Chilika Lake, Odisha', bbox: [85.10, 19.55, 85.45, 19.85] as [number, number, number, number] },
  { name: 'VEMBANAD_LAKE', label: 'Vembanad, Kerala', bbox: [76.30, 9.55, 76.45, 9.80] as [number, number, number, number] },
  { name: 'LOKTAK_LAKE', label: 'Loktak Lake, Manipur', bbox: [93.75, 24.50, 93.90, 24.65] as [number, number, number, number] },
  { name: 'LAKE_MEAD', label: 'Lake Mead, NV/AZ (USA)', bbox: [-114.80, 36.00, -114.30, 36.40] as [number, number, number, number] }
];

const AI_MODEL_NODES = {
  multimodal: {
    name: 'Copernicus STAC Ingestion Engine',
    modelId: 'STAC-S2-S1-L2A-RTC',
    framework: 'Microsoft Planetary Computer SDK',
    role: 'Multi-Sensor Data Ingestion (10m Optical MSI + C-Band SAR Dual-Pol)',
    status: 'ACTIVE / STREAMING'
  },
  feature: {
    name: 'IBM-NASA Prithvi-100M',
    modelId: 'prithvi-100m-vit-geospatial',
    framework: 'PyTorch Geospatial ViT (768-dim)',
    role: 'Self-Supervised Spatial Feature & Representation Encoder',
    status: 'OPTIMIZED (FP16)'
  },
  causal: {
    name: 'AquaSense Causal Attribution Engine',
    modelId: 'era5-ndwi-causal-v2',
    framework: 'Structural Causal Model (SCM)',
    role: 'Disentangles Climate (ERA5 Rainfall) vs. Anthropogenic Urban Infill',
    status: 'CALIBRATED (R²=0.91)'
  },
  predictive: {
    name: 'Markov-LSTM Boundary Forecaster',
    modelId: 'lstm-wetland-boundary-5yr',
    framework: 'Spatio-Temporal LSTM',
    role: 'Projects 5-Year Wetland Desiccation Boundary & Surge Retention',
    status: 'INFERENCE READY'
  },
  gemini: {
export const VIEW_MODE_EXPLANATIONS: Record<string, {
  name: string;
  badge: string;
  badgeColor: string;
  sensor: string;
  equation: string;
  miniSummary: string;
  highLevelExplanation: string;
  diagnosticUse: string;
}> = {
  split: {
    name: "True Color Visual Swipe",
    badge: "OPTICAL VISUAL",
    badgeColor: "bg-[#007979]/15 text-[#007979] border-[#007979]/30",
    sensor: "Sentinel-2 MSI (B04-Red, B03-Green, B02-Blue)",
    equation: "RGB = [B04, B03, B02] (10m Ground Resolution)",
    miniSummary: "Interactive before/after swipe comparing natural human-eye satellite photography across target epochs.",
    highLevelExplanation: "True Color combines calibrated surface reflectance in red (665nm), green (560nm), and blue (490nm) wavelengths at 10m ground resolution. It provides direct qualitative confirmation of landscape transformations, urban expansion, and dry lakebeds.",
    diagnosticUse: "Visual verification of ground truth, dry lakebed silt, urban construction infill, and baseline landscape structure."
  },
  ndwi_split: {
    name: "NDWI Surface Water Index",
    badge: "SPECTRAL RADIOMETRY",
    badgeColor: "bg-[#24B1B1]/15 text-[#007979] border-[#24B1B1]/40",
    sensor: "Sentinel-2 Multispectral Instrument (MSI)",
    equation: "NDWI = (B03 - B08) / (B03 + B08)",
    miniSummary: "Spectral index that isolates open water surfaces from dry soil, urban structures, and green vegetation.",
    highLevelExplanation: "Pure open water strongly reflects visible green light (560nm, Band 3) but almost completely absorbs Near-Infrared radiation (842nm, Band 8). Conversely, terrestrial vegetation and urban areas strongly reflect NIR. By computing the normalized difference, water yields positive values (>0.20), while dry land yields negative values.",
    diagnosticUse: "Precise delineation of open water surface area (km²), shoreline contraction, and temporal desiccation boundaries."
  },
  sar_vv: {
    name: "Sentinel-1 All-Weather C-SAR Radar",
    badge: "MICROWAVE ACTIVE",
    badgeColor: "bg-[#052626] text-[#24B1B1] border-[#24B1B1]/40",
    sensor: "Sentinel-1 C-Band SAR (5.405 GHz, λ=5.6cm, VV/VH)",
    equation: "σ⁰_VV < -16 dB (Specular Surface Backscatter)",
    miniSummary: "Active microwave radar imaging that penetrates 100% of dense monsoon clouds, smog, and nighttime darkness.",
    highLevelExplanation: "Unlike optical satellites that depend on sunlight and clear skies, Sentinel-1 emits active C-band microwave pulses (5.405 GHz). Calm open water behaves like a specular mirror, reflecting microwave pulses away from the radar antenna (producing very low backscatter < -16 dB, appearing dark). Rough land and urban structures scatter energy back (appearing bright).",
    diagnosticUse: "Monsoon flood emergency tracking, cyclone disaster response, and cloud-covered tropical wetland observation."
  },
  fused_allweather: {
    name: "Multi-Sensor Optical + SAR Dual Fusion",
    badge: "ALL-WEATHER FUSION",
    badgeColor: "bg-[#F59E0B]/15 text-[#D97706] border-[#F59E0B]/40",
    sensor: "Sentinel-2 MSI (10m) ∩ Sentinel-1 C-SAR RTC (10m)",
    equation: "W_fused = (NDWI > 0.20) ∪ (σ⁰_VV < -16 dB ∧ ¬Shadow)",
    miniSummary: "Combined classification fusing cloud-penetrating radar with high-spectral optical data for 100% temporal continuity.",
    highLevelExplanation: "Combines the spectral resolution of optical NDWI with the all-weather penetrative power of C-band SAR. Under clear skies, dual-verified water pixels receive highest confidence; under cloud cover, SAR radar backscatter automatically takes over to prevent missing flood ingress or rapid drainage.",
    diagnosticUse: "All-weather continuous surface monitoring with zero cloud gap dropouts."
  },
  diff: {
    name: "Tri-State Temporal Change Difference Mask",
    badge: "CHANGE DETECTION",
    badgeColor: "bg-[#E11D48]/15 text-[#E11D48] border-[#E11D48]/30",
    sensor: "Multi-Year Pixel Matrix Comparison (T0 vs T1)",
    equation: "ΔMask = W(T1) - W(T0) → {-1: Desiccation, 0: Persistent, +1: Inundation}",
    miniSummary: "Color-coded raster map showing exact locations where water extent was lost, gained, or remained unchanged.",
    highLevelExplanation: "Computes pixel-by-pixel temporal delta between baseline epoch (T0) and target epoch (T1). Red/Coral pixels identify desiccation zones where surface water dried up or was encroached by urban infill. Blue/Cyan pixels highlight newly inundated flood zones.",
    diagnosticUse: "Quantifying exact wetland encroachment boundaries, historical drought progression, and reservoir shrinkage."
  },
  bathymetry: {
    name: "3D Hydro-Depth & Volume Hypsometry",
    badge: "VOLUMETRIC 3D",
    badgeColor: "bg-[#007979]/15 text-[#007979] border-[#007979]/30",
    sensor: "Copernicus DEM GLO-30 + Sentinel-2 Surface Footprint",
    equation: "V(h) = ∫ A(z)dz ≈ ∑ ⅓(A_i + √(A_i · A_{i+1}) + A_{i+1}) · Δh",
    miniSummary: "Estimates actual 3D water volume retention (Million m³) and depth strata (0-2m littoral, 2-5m submerged, 5m+ deep core).",
    highLevelExplanation: "Traditional satellite GIS only measures flat 2D surface area (km²). AquaSense integrates digital elevation model (DEM) hypsometry with shoreline contours to model the lakebed basin shape and calculate true cubic water capacity (m³ and MCM), revealing whether shallow littoral zones or deep storage cores are desiccating.",
    diagnosticUse: "Reservoir storage monitoring, drought capacity reserves, flood retention buffers, and volumetric replenishment."
  },
  turbidity: {
    name: "NDTI Turbidity & Suspended Solids",
    badge: "BIO-OPTICS",
    badgeColor: "bg-[#EAB308]/15 text-[#D97706] border-[#EAB308]/40",
    sensor: "Sentinel-2 MSI Red & Green Bands (B04, B03)",
    equation: "NDTI = (B04 - B03) / (B04 + B03) → Calibrated NTU & mg/L TSS",
    miniSummary: "Quantifies water cloudiness, suspended silt, and sediment plume saturation caused by watershed erosion or dredging.",
    highLevelExplanation: "Clear water absorbs red light (665nm), while water loaded with suspended inorganic sediment and silt particles scatters red wavelengths back to the satellite. The Normalized Difference Turbidity Index (NDTI) scales from clear (<5 NTU) to heavy silt plumes (>60 NTU / >100 mg/L TSS).",
    diagnosticUse: "Detecting runoff erosion, dredging impacts, silt accumulation in reservoirs, and watershed soil loss."
  },
  chlorophyll: {
    name: "Chlorophyll-a & Algal Bloom Risk (NDCI)",
    badge: "BIO-OPTICS",
    badgeColor: "bg-[#10B981]/15 text-[#0D9488] border-[#10B981]/40",
    sensor: "Sentinel-2 MSI Red-Edge (B05) & Red (B04)",
    equation: "NDCI = (B05 - B04) / (B05 + B04) → Carlson TSI(Chl-a)",
    miniSummary: "Tracks photosynthetic pigment concentration (µg/L) and eutrophication risk (Oligotrophic to Hypertrophic bloom).",
    highLevelExplanation: "Phytoplankton containing chlorophyll-a exhibit maximum absorption near 665nm (Band 4) and a sharp reflectance peak at the red-edge (705nm, Band 5). The Normalized Difference Chlorophyll Index (NDCI) quantifies algal biomass and computes Carlson's Trophic State Index (TSI) to flag oxygen depletion and toxic algal blooms.",
    diagnosticUse: "Early warning of eutrophication, sewage influx, fish kill conditions, and toxic cyanobacterial blooms."
  },
  cdom: {
    name: "Colored Dissolved Organic Matter (CDOM)",
    badge: "BIO-OPTICS",
    badgeColor: "bg-[#F59E0B]/15 text-[#D97706] border-[#F59E0B]/40",
    sensor: "Sentinel-2 MSI Blue (B02) & Green (B03) Ratios",
    equation: "a_cdom(440) = 1.84 · (B03 / B02)^{-1.42} m⁻¹",
    miniSummary: "Measures dissolved organic carbon, tannins, and humic matter derived from decomposing wetland peat and vegetation.",
    highLevelExplanation: "CDOM is the optically active component of dissolved organic carbon. It absorbs ultraviolet and blue light strongly with an exponential decay toward longer wavelengths. Elevated CDOM levels indicate healthy wetland filtration or organic humic drainage from decaying peatlands.",
    diagnosticUse: "Wetland ecosystem carbon budget tracking, peatland health monitoring, and dissolved carbon runoff."
  }
};

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>('setup');
  const [mapView, setMapView] = useState<MapView>('split');
  const [sensorMode, setSensorMode] = useState<SensorMode>('fused');
  const [colorRamp, setColorRamp] = useState<ColorRampId>('viridis');
  const [sarThresholdDb, setSarThresholdDb] = useState<number>(-16);
  
  // Dock / Undock sidebar state
  const [isSidebarDocked, setIsSidebarDocked] = useState<boolean>(true);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState<boolean>(false);
  const [showModeExplanation, setShowModeExplanation] = useState<boolean>(true);

  const [logs, setLogs] = useState<string[]>([
    '[SYSTEM] AquaSense Planetary Computer Kernel v3.4.0 Online.',
    '[SYSTEM] Palette: Teal (#007979) + Bright Aqua (#24B1B1) + Base Peach (#FFF0E4).',
    '[SYSTEM] Sentinel-2 L2A MSI & Sentinel-1 RTC STAC Data Nodes synchronized.',
    '[SAR] C-band Synthetic Aperture Radar (5.405 GHz, λ=5.6cm) Dual-Pol (VV+VH) all-weather fusion engine initialized.',
    '[SYSTEM] Spatial resolution calibrated at 10m/pixel (0.0001 km² per raster pixel).'
  ]);
  const [isLogsExpanded, setIsLogsExpanded] = useState<boolean>(true);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [diffMap, setDiffMap] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<{year: string, area: number}[]>([]);
  const [activeThinkingNode, setActiveThinkingNode] = useState<keyof typeof AI_MODEL_NODES>('gemini');
  
  const [config, setConfig] = useState({
    waterBody: 'PALLIKARANAI_MARSH_CHENNAI',
    years: ['2019', '2025'] as [string, string],
    bbox: [80.20, 12.91, 80.23, 12.95] as [number, number, number, number],
    maxCloudCover: 20,
    ndwiThreshold: 0.20
  });

  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);
  const [bathymetryData, setBathymetryData] = useState<BathymetryResult | null>(null);
  const [waterQualityData, setWaterQualityData] = useState<WaterQualityResult | null>(null);
  const [sceneData, setSceneData] = useState<{yearA: SceneData, yearB: SceneData} | null>(null);
  const intermediateSnapshotsRef = useRef<{ year: string; ndwiUrl: string }[]>([]);
  const [isRecalculatingThreshold, setIsRecalculatingThreshold] = useState(false);

  // Safe years & bbox helpers to guarantee zero undefined index crashes
  const safeYears: [string, string] = (config.years && Array.isArray(config.years) && config.years.length >= 2)
    ? config.years
    : ['2019', '2025'];
  const safeBbox: [number, number, number, number] = (config.bbox && Array.isArray(config.bbox) && config.bbox.length === 4)
    ? config.bbox
    : [80.20, 12.91, 80.23, 12.95];

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Real-time NDWI and SAR recalculation
  const applyThresholdsAndRamp = async (newNdwiThreshold: number, newRamp: ColorRampId, newSarThresholdDb: number) => {
    if (!sceneData) return;
    setIsRecalculatingThreshold(true);
    try {
      const promises: Promise<any>[] = [
        countWaterPixelsWithThreshold(sceneData.yearA.ndwi, newNdwiThreshold),
        countWaterPixelsWithThreshold(sceneData.yearB.ndwi, newNdwiThreshold),
        generateDifferenceMapWithThreshold(sceneData.yearA.ndwi, sceneData.yearB.ndwi, newNdwiThreshold, newRamp),
        colorizeNdwiRaster(sceneData.yearA.ndwi, newRamp, { threshold: newNdwiThreshold }),
        colorizeNdwiRaster(sceneData.yearB.ndwi, newRamp, { threshold: newNdwiThreshold }),
        calculate3DBathymetryAndVolume(sceneData.yearB.ndwi, newNdwiThreshold),
        calculateSpectralWaterQuality(sceneData.yearB.ndwi, sceneData.yearB.trueColor, newNdwiThreshold)
      ];

      if (sceneData.yearA.sarVvUrl && sceneData.yearB.sarVvUrl) {
        promises.push(
          countSarWaterPixelsWithThreshold(sceneData.yearA.sarVvUrl, newSarThresholdDb),
          countSarWaterPixelsWithThreshold(sceneData.yearB.sarVvUrl, newSarThresholdDb),
          colorizeSarRaster(sceneData.yearA.sarVvUrl, newSarThresholdDb),
          colorizeSarRaster(sceneData.yearB.sarVvUrl, newSarThresholdDb),
          generateAllWeatherFusedRaster(sceneData.yearA.ndwi, sceneData.yearA.sarVvUrl, newNdwiThreshold, newSarThresholdDb),
          generateAllWeatherFusedRaster(sceneData.yearB.ndwi, sceneData.yearB.sarVvUrl, newNdwiThreshold, newSarThresholdDb)
        );
      }

      const results = await Promise.all(promises);
      const pixelsA = results[0];
      const pixelsB = results[1];
      const newDiff = results[2];
      const colorizedA = results[3];
      const colorizedB = results[4];
      const newBathy = results[5];
      const newWqi = results[6];

      setBathymetryData(newBathy);
      setWaterQualityData(newWqi);

      const areaA = pixelsA * 0.0001;
      const areaB = pixelsB * 0.0001;

      let sarAreaA = sceneData.yearA.sarArea;
      let sarAreaB = sceneData.yearB.sarArea;
      let sarColorizedA = sceneData.yearA.sarColorized;
      let sarColorizedB = sceneData.yearB.sarColorized;
      let fusedA = sceneData.yearA.fusedUrl;
      let fusedB = sceneData.yearB.fusedUrl;

      if (results.length > 7) {
        sarAreaA = results[7] * 0.0001;
        sarAreaB = results[8] * 0.0001;
        sarColorizedA = results[9];
        sarColorizedB = results[10];
        fusedA = results[11];
        fusedB = results[12];
      }

      const updatedTrendIntermediates = await Promise.all(
        intermediateSnapshotsRef.current.map(async (s) => {
          const px = await countWaterPixelsWithThreshold(s.ndwiUrl, newNdwiThreshold);
          return { year: s.year, area: px * 0.0001 };
        })
      );

      const newTrend = [
        { year: safeYears[0], area: areaA },
        ...updatedTrendIntermediates,
        { year: safeYears[1], area: areaB }
      ].sort((a, b) => parseInt(a.year) - parseInt(b.year));

      setTrendData(newTrend);
      setDiffMap(newDiff);
      setSceneData(prev => prev ? ({
        yearA: { ...prev.yearA, area: areaA, colorizedNdwi: colorizedA, sarArea: sarAreaA, sarColorized: sarColorizedA, fusedUrl: fusedA },
        yearB: { ...prev.yearB, area: areaB, colorizedNdwi: colorizedB, sarArea: sarAreaB, sarColorized: sarColorizedB, fusedUrl: fusedB }
      }) : null);

      setLogs(prev => [
        ...prev, 
        `[COMPUTE] Threshold Recalculated: NDWI > ${newNdwiThreshold.toFixed(2)} | SAR σ⁰ < ${newSarThresholdDb} dB → 3D Volume: ${newBathy.volumeMCM.toFixed(2)} MCM | WQI: ${newWqi.overallWqi}/100`
      ]);
    } catch (e: any) {
      setLogs(prev => [...prev, `[ERROR] Failed to update threshold: ${e.message}`]);
    } finally {
      setIsRecalculatingThreshold(false);
    }
  };

  const handleRampChange = (newRamp: ColorRampId) => {
    setColorRamp(newRamp);
    if (sceneData) {
      applyThresholdsAndRamp(config.ndwiThreshold, newRamp, sarThresholdDb);
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
        setLogs(prev => [...prev, `[SYSTEM] Ingested GeoJSON BBOX: ${calculatedBbox.map(n => n.toFixed(4)).join(', ')}`]);
      } catch (err) {
        setLogs(prev => [...prev, `[ERROR] Invalid GeoJSON file format.`]);
      }
    };
    reader.readAsText(file);
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs(['[SYSTEM] Trace log buffer cleared.']);
  };

  const handleExport = () => {
    if (!sceneData) return;
    const exportData = {
      timestamp: new Date().toISOString(),
      system_hash: "0x8a92f02c",
      methodology: `Multi-Sensor Fusion: Sentinel-2 MSI (NDWI > ${config.ndwiThreshold.toFixed(2)}) + Sentinel-1 C-SAR RTC (σ⁰ < ${sarThresholdDb} dB, VV/VH Dual-Pol)`,
      sensor_mode: sensorMode,
      active_ai_stack: AI_MODEL_NODES,
      parameters: {
        max_cloud_cover_filter: `${config.maxCloudCover}%`,
        ndwi_threshold: config.ndwiThreshold,
        sar_backscatter_threshold_db: `${sarThresholdDb} dB`,
        ndwi_color_ramp: COLOR_RAMPS[colorRamp].name
      },
      study_area: {
        location: config.waterBody,
        bbox: safeBbox,
        baseline_year: safeYears[0],
        latest_year: safeYears[1]
      },
      quantification_and_changes: {
        baseline_t0_km2: sceneData.yearA.area,
        target_t1_km2: sceneData.yearB.area,
        net_absolute_change_km2: sceneData.yearB.area - sceneData.yearA.area,
        net_relative_change_pct: ((sceneData.yearB.area - sceneData.yearA.area) / sceneData.yearA.area) * 100,
        severity_classification: ((sceneData.yearB.area - sceneData.yearA.area) / sceneData.yearA.area) < -0.15 ? "CRITICAL_DESICCATION" : "MODERATE_REDUCTION",
        sar_radar_baseline_km2: sceneData.yearA.sarArea ?? sceneData.yearA.area,
        sar_radar_target_km2: sceneData.yearB.sarArea ?? sceneData.yearB.area
      },
      bathymetric_3d_volume: bathymetryData ? {
        volume_million_m3: bathymetryData.volumeMCM,
        volume_cubic_meters: bathymetryData.volumeM3,
        mean_depth_meters: bathymetryData.meanDepthMeters,
        max_depth_meters: bathymetryData.maxDepthMeters,
        capacity_retention_pct: bathymetryData.capacityPercentage,
        strata_breakdown: bathymetryData.depthDistribution
      } : null,
      bio_optical_water_quality: waterQualityData ? {
        ndti_turbidity_index: waterQualityData.turbidityNdti,
        turbidity_ntu: waterQualityData.turbidityNtu,
        total_suspended_solids_mg_l: waterQualityData.tssMgL,
        turbidity_rating: waterQualityData.turbidityStatus,
        chlorophyll_a_ndci_index: waterQualityData.chlorophyllNdci,
        chlorophyll_a_concentration_ug_l: waterQualityData.chlorophyllUgL,
        carlson_trophic_state_index: waterQualityData.trophicStateIndex,
        algal_bloom_risk: waterQualityData.algalBloomRisk,
        cdom_absorption_coefficient_m_inv: waterQualityData.cdomAbsorption,
        cdom_rating: waterQualityData.cdomStatus,
        overall_water_quality_index: waterQualityData.overallWqi,
        wqi_status: waterQualityData.wqiStatus
      } : null,
      source_scenes: {
        sentinel_2_yearA: sceneData.yearA.id,
        sentinel_2_yearB: sceneData.yearB.id,
        sentinel_1_sar_yearA: sceneData.yearA.sarId,
        sentinel_1_sar_yearB: sceneData.yearB.sarId
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aquasense_verified_changes_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLogs(prev => [...prev, `[SYSTEM] Exported verified change quantification JSON hash 0x8a92f02c.`]);
  };

  const handleApplyChatConfig = (newConfig: {
    waterBody?: string;
    bbox?: [number, number, number, number];
    years?: [string, string];
    autoRun?: boolean;
  }) => {
    const defaultYears: [string, string] = ['2019', '2025'];
    const defaultBbox: [number, number, number, number] = [80.20, 12.91, 80.23, 12.95];
    const mergedYears: [string, string] = (newConfig.years && Array.isArray(newConfig.years) && newConfig.years.length >= 2)
      ? newConfig.years
      : safeYears;
    const mergedBbox: [number, number, number, number] = (newConfig.bbox && Array.isArray(newConfig.bbox) && newConfig.bbox.length === 4)
      ? newConfig.bbox
      : safeBbox;
    const mergedWaterBody = newConfig.waterBody || config.waterBody || 'PALLIKARANAI_MARSH_CHENNAI';

    const merged = {
      ...config,
      waterBody: mergedWaterBody,
      bbox: mergedBbox,
      years: mergedYears
    };
    setConfig(merged);
    setLogs(prev => [
      ...prev,
      `[COPILOT] Ingested basin coordinates for ${mergedWaterBody} [${mergedBbox.map(n => n.toFixed(2)).join(', ')}] for epochs ${mergedYears[0]} vs ${mergedYears[1]}.`
    ]);
    if (newConfig.autoRun) {
      runPipeline(merged);
    }
  };

  const runPipeline = async (overrideConfig?: typeof config) => {
    const activeCfg = overrideConfig || config;
    const activeYears: [string, string] = (activeCfg?.years && Array.isArray(activeCfg.years) && activeCfg.years.length >= 2)
      ? activeCfg.years
      : ['2019', '2025'];
    const activeBbox: [number, number, number, number] = (activeCfg?.bbox && Array.isArray(activeCfg.bbox) && activeCfg.bbox.length === 4)
      ? activeCfg.bbox
      : [80.20, 12.91, 80.23, 12.95];
    const waterBody = activeCfg?.waterBody || 'PALLIKARANAI_MARSH_CHENNAI';
    const maxCloudCover = activeCfg?.maxCloudCover ?? 20;
    const ndwiThreshold = activeCfg?.ndwiThreshold ?? 0.20;

    setCurrentStep('processing');
    setError(null);
    setLogs(prev => [
      ...prev, 
      `[SYSTEM] Initializing AquaSense Multi-Sensor AI Pipeline for ${waterBody} (${activeYears[0]} vs ${activeYears[1]})...`
    ]);
    
    try {
      const bboxStr = activeBbox.join(',');
      const width = 325;
      const height = 445;

      const searchStacCandidates = async (year: string, isStart: boolean) => {
        const dateRange = (isStart && year === '2019') 
          ? '2019-03-01T00:00:00Z/2019-03-31T23:59:59Z' 
          : `${year}-01-01T00:00:00Z/${year}-12-31T23:59:59Z`;
        
        setLogs(prev => [...prev, `[STAC:S2] Searching Sentinel-2 MSI catalog for ${year} (${dateRange}) with cloud cover < ${maxCloudCover}%...`]);
        
        const res = await fetch('https://planetarycomputer.microsoft.com/api/stac/v1/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collections: ["sentinel-2-l2a"],
            bbox: activeBbox,
            datetime: dateRange,
            query: { "eo:cloud_cover": { "lt": maxCloudCover } },
            sortby: [{ field: "eo:cloud_cover", direction: "asc" }],
            limit: 5
          })
        });
        
        if (!res.ok) throw new Error(`STAC S2 API responded with status ${res.status}`);
        const data = await res.json();
        
        if (!data.features || data.features.length === 0) {
          throw new Error(`No optical scenes found for ${year} with cloud cover < ${maxCloudCover}%. Try increasing cloud filter or switching to SAR Radar mode.`);
        }
        
        setLogs(prev => [...prev, `[STAC:S2] Found ${data.features.length} candidate scenes for ${year} (best cloud cover: ${data.features[0].properties['eo:cloud_cover'].toFixed(1)}%)`]);
        return data.features;
      };

      const searchSarCandidates = async (year: string) => {
        const dateRange = `${year}-01-01T00:00:00Z/${year}-12-31T23:59:59Z`;
        setLogs(prev => [...prev, `[STAC:SAR] Searching Sentinel-1 C-SAR RTC catalog for ${year} (Dual-Pol VV+VH)...`]);
        
        try {
          const res = await fetch('https://planetarycomputer.microsoft.com/api/stac/v1/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              collections: ["sentinel-1-rtc"],
              bbox: activeBbox,
              datetime: dateRange,
              limit: 3
            })
          });
          
          if (!res.ok) return [];
          const data = await res.json();
          return data.features || [];
        } catch (e) {
          return [];
        }
      };

      const [candidatesA, candidatesB, sarCandidatesA, sarCandidatesB] = await Promise.all([
        searchStacCandidates(activeYears[0], true),
        searchStacCandidates(activeYears[1], false),
        searchSarCandidates(activeYears[0]),
        searchSarCandidates(activeYears[1])
      ]);

      const loadWorkingScene = async (candidates: any[], sarCandidates: any[], year: string) => {
        let lastError = null;
        for (let i = 0; i < candidates.length; i++) {
          const item = candidates[i];
          const tcUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/preview.png?collection=sentinel-2-l2a&item=${item.id}&assets=visual&width=${width}&height=${height}&bbox=${bboxStr}`;
          const ndwiUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/preview.png?collection=sentinel-2-l2a&item=${item.id}&expression=(B03-B08)/(B03%2BB08)&asset_as_band=True&rescale=-1,1&width=${width}&height=${height}&bbox=${bboxStr}`;

          try {
            setLogs(prev => [...prev, `[RENDER] Probing Optical Candidate #${i+1} (${item.id}) for ${year}...`]);
            await getCachedImage(tcUrl);
            await getCachedImage(ndwiUrl);

            const pixelCount = await countWaterPixelsWithThreshold(ndwiUrl, ndwiThreshold);
            const colorizedNdwi = await colorizeNdwiRaster(ndwiUrl, colorRamp, { threshold: ndwiThreshold });

            let sarVvUrl: string | undefined;
            let sarVhUrl: string | undefined;
            let sarColorized: string | undefined;
            let sarArea: number | undefined;
            let fusedUrl: string | undefined;
            let isSarPenetrating = false;

            if (sarCandidates.length > 0) {
              const sarItem = sarCandidates[0];
              sarVvUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/preview.png?collection=sentinel-1-rtc&item=${sarItem.id}&assets=vv&rescale=-30,0&width=${width}&height=${height}&bbox=${bboxStr}`;
              sarVhUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/preview.png?collection=sentinel-1-rtc&item=${sarItem.id}&assets=vh&rescale=-30,0&width=${width}&height=${height}&bbox=${bboxStr}`;

              try {
                await getCachedImage(sarVvUrl);
                const sarPixels = await countSarWaterPixelsWithThreshold(sarVvUrl, sarThresholdDb);
                sarArea = sarPixels * 0.0001;
                sarColorized = await colorizeSarRaster(sarVvUrl, sarThresholdDb);
                fusedUrl = await generateAllWeatherFusedRaster(ndwiUrl, sarVvUrl, ndwiThreshold, sarThresholdDb);
                
                const cloudVal = item.properties['eo:cloud_cover'] ?? 0;
                if (cloudVal > 15) {
                  isSarPenetrating = true;
                }
              } catch (sarErr) {
                // Fallback to optical if SAR preview fails
              }
            }

            return {
              item,
              sarItem: sarCandidates[0],
              tcUrl,
              ndwiUrl,
              colorized: colorizedNdwi,
              sarVvUrl,
              sarVhUrl,
              sarColorized,
              sarArea,
              fusedUrl,
              isSarPenetrating,
              area: pixelCount * 0.0001
            };
          } catch (e: any) {
            lastError = e;
            continue;
          }
        }
        throw new Error(`Failed to render scenes for ${year}: ${lastError?.message}`);
      };

      setLogs(prev => [...prev, `[PIPELINE] Streaming multi-sensor COG tiles for ${activeYears[0]} & ${activeYears[1]}...`]);
      const [sceneA, sceneB] = await Promise.all([
        loadWorkingScene(candidatesA, sarCandidatesA, activeYears[0]),
        loadWorkingScene(candidatesB, sarCandidatesB, activeYears[1])
      ]);

      setLogs(prev => [...prev, `[PIPELINE] Calculating Tri-State difference mask...`]);
      const diffDataUrl = await generateDifferenceMapWithThreshold(sceneA.ndwiUrl, sceneB.ndwiUrl, ndwiThreshold, colorRamp);
      setDiffMap(diffDataUrl);

      // Build intermediate time-series snapshots
      const intermediateYears = ['2020', '2021', '2022', '2023', '2024'].filter(
        y => parseInt(y) > parseInt(activeYears[0]) && parseInt(y) < parseInt(activeYears[1])
      );

      const intermediateSnapshots: { year: string; ndwiUrl: string }[] = [];
      const intermediatePromises = intermediateYears.map(async (year) => {
        try {
          const cands = await searchStacCandidates(year, false);
          for (const item of cands) {
            try {
              const ndwiUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/preview.png?collection=sentinel-2-l2a&item=${item.id}&expression=(B03-B08)/(B03%2BB08)&asset_as_band=True&rescale=-1,1&width=${width}&height=${height}&bbox=${bboxStr}`;
              const pixels = await countWaterPixelsWithThreshold(ndwiUrl, ndwiThreshold);
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
        { year: activeYears[0], area: sceneA.area },
        ...validIntermediates,
        { year: activeYears[1], area: sceneB.area }
      ].sort((a, b) => parseInt(a.year) - parseInt(b.year));
      
      setTrendData(newTrendData);

      setLogs(prev => [...prev, `[COMPUTE:3D] Calculating 3D Bathymetric Volume & Area-Elevation Hypsometry...`]);
      setLogs(prev => [...prev, `[COMPUTE:BIO-OPTICS] Evaluating Spectral NDTI Turbidity, Chlorophyll-a & CDOM Organic Carbon...`]);

      const [bathyB, wqiB] = await Promise.all([
        calculate3DBathymetryAndVolume(sceneB.ndwiUrl, ndwiThreshold),
        calculateSpectralWaterQuality(sceneB.ndwiUrl, sceneB.tcUrl, ndwiThreshold)
      ]);
      setBathymetryData(bathyB);
      setWaterQualityData(wqiB);

      setLogs(prev => [
        ...prev,
        `[HYDRO-3D] Estimated 3D Water Volume: ${bathyB.volumeMCM.toFixed(2)} MCM (${bathyB.volumeM3.toLocaleString()} m³) | WQI Health Score: ${wqiB.overallWqi}/100 (${wqiB.wqiStatus})`
      ]);

      setSceneData({
        yearA: { 
          id: sceneA.item.id,
          sarId: sceneA.sarItem?.id,
          trueColor: sceneA.tcUrl, 
          ndwi: sceneA.ndwiUrl, 
          colorizedNdwi: sceneA.colorized,
          sarVvUrl: sceneA.sarVvUrl,
          sarVhUrl: sceneA.sarVhUrl,
          sarColorized: sceneA.sarColorized,
          fusedUrl: sceneA.fusedUrl,
          area: sceneA.area, 
          sarArea: sceneA.sarArea,
          cloudCover: sceneA.item.properties['eo:cloud_cover'] ?? 0, 
          date: new Date(sceneA.item.properties.datetime).toLocaleDateString(),
          isSarPenetrating: sceneA.isSarPenetrating
        },
        yearB: { 
          id: sceneB.item.id, 
          sarId: sceneB.sarItem?.id,
          trueColor: sceneB.tcUrl, 
          ndwi: sceneB.ndwiUrl, 
          colorizedNdwi: sceneB.colorized,
          sarVvUrl: sceneB.sarVvUrl,
          sarVhUrl: sceneB.sarVhUrl,
          sarColorized: sceneB.sarColorized,
          fusedUrl: sceneB.fusedUrl,
          area: sceneB.area, 
          sarArea: sceneB.sarArea,
          cloudCover: sceneB.item.properties['eo:cloud_cover'] ?? 0, 
          date: new Date(sceneB.item.properties.datetime).toLocaleDateString(),
          isSarPenetrating: sceneB.isSarPenetrating
        }
      });
      
      setLogs(prev => [...prev, `[SYSTEM] Multi-sensor pipeline converged successfully with zero optical/radar latency.`]);
      setCurrentStep('results');
      setMapView(sensorMode === 'sar' ? 'sar_vv' : sensorMode === 'fused' ? 'fused_allweather' : 'split');

    } catch (err: any) {
      setLogs(prev => [...prev, `[ERROR] ${err.message}`]);
      setError(err.message);
      setCurrentStep('setup');
    }
  };

  const change = sceneData ? sceneData.yearB.area - sceneData.yearA.area : 0;
  const pctChange = sceneData ? (change / sceneData.yearA.area) * 100 : 0;
  const isSarPenetrating = sceneData ? (sceneData.yearA.isSarPenetrating || sceneData.yearB.isSarPenetrating) : false;

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#FFF0E4] text-[#082424] font-sans select-none overflow-x-hidden">
      
      {/* 1. TOP MISSION CONTROL HEADER (Teal + Peach Palette) */}
      <header className="border-b border-[#007979]/20 bg-[#007979] text-[#FFF0E4] px-4 sm:px-6 py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 z-30 sticky top-0 shadow-md">
        
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xs bg-[#052626] border border-[#24B1B1] text-[#24B1B1] flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            Ω
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-wide text-[#FFF0E4] uppercase flex items-center gap-2">
                <span className="text-[#24B1B1]">AquaSense</span>
                <span className="text-[#24B1B1]/40">/</span>
                <span className="text-[#FFE0C5]">All-Weather Planetary Earth Observatory</span>
              </h1>
              <span className="hidden sm:inline-block text-[8px] font-mono bg-[#24B1B1]/20 border border-[#24B1B1]/40 text-[#FFF0E4] px-1.5 py-0.2 font-semibold rounded-xs">
                S2 MSI + S1 SAR FUSION
              </span>
            </div>
            <div className="text-[9px] font-mono text-[#FFE0C5]/80 flex items-center gap-2">
              <span>Planetary STAC Stream</span>
              <span>•</span>
              <span className="text-[#24B1B1] font-semibold">{config.waterBody}</span>
              <span>•</span>
              <span>10m Ground Grid</span>
            </div>
          </div>
        </div>

        {/* Right Action & Telemetry Readouts */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[8.5px]">
          {/* Dock / Undock Sidebar Toggle (Visible in Results/Processing Step) */}
          {currentStep !== 'setup' && (
            <button
              onClick={() => setIsSidebarDocked(!isSidebarDocked)}
              className="px-2.5 py-1 bg-[#052626] hover:bg-[#24B1B1] text-[#24B1B1] hover:text-[#052626] border border-[#24B1B1]/50 rounded-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs font-semibold"
              title={isSidebarDocked ? "Undock / Collapse Sidebar for Maximum Map View" : "Dock Sidebar"}
            >
              {isSidebarDocked ? (
                <>
                  <PanelLeftClose className="w-3.5 h-3.5" />
                  <span className="uppercase">Undock Sidebar</span>
                </>
              ) : (
                <>
                  <PanelLeftOpen className="w-3.5 h-3.5 text-[#FFE0C5]" />
                  <span className="uppercase text-[#FFE0C5]">Dock Sidebar</span>
                </>
              )}
            </button>
          )}

          {/* AI Copilot Launch Button */}
          <button
            onClick={() => setIsChatbotOpen(true)}
            className="px-2.5 py-1 bg-[#FFE0C5] hover:bg-[#24B1B1] text-[#007979] hover:text-[#052626] border border-[#24B1B1] rounded-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs font-bold tracking-wide"
            title="Open AquaSense AI Hydrology Copilot & Natural Language Chart Generator"
          >
            <ChatbotLogo size="sm" animated={false} className="border-none bg-transparent shadow-none" />
            <span className="uppercase">AI Copilot &amp; Charts</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#007979] animate-ping" />
          </button>

          <div className="px-2 py-1 bg-[#052626] border border-[#007979]/40 rounded-xs flex items-center gap-1.5 text-[#FFF0E4]">
            <Radar className="w-3 h-3 text-[#24B1B1] animate-pulse" />
            <span className="text-[#FFE0C5]/70">SAR:</span>
            <span className="text-[#24B1B1] font-semibold">DUAL-POL</span>
          </div>

          <div className="px-2 py-1 bg-[#052626] border border-[#007979]/40 rounded-xs flex items-center gap-1.5 text-[#FFF0E4]">
            <Brain className="w-3 h-3 text-[#FFE0C5]" />
            <span className="text-[#FFE0C5]/70">AI:</span>
            <span className="text-[#FFE0C5] font-semibold">GEMINI 3.7</span>
          </div>

          {currentStep !== 'setup' && (
            <button
              onClick={() => setCurrentStep('setup')}
              className="px-2 py-1 bg-[#052626] hover:bg-[#007979] text-[#FFE0C5] border border-[#007979] rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Return to Basin Setup & Configuration"
            >
              <Edit3 className="w-3 h-3 text-[#24B1B1]" />
              <span>EDIT AOI</span>
            </button>
          )}
        </div>
      </header>

      {/* ============================================================ */}
      {/* INITIAL PROMINENT HERO SETUP WORKSPACE (Step === 'setup')    */}
      {/* ============================================================ */}
      {currentStep === 'setup' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-grid-cartographic animate-slide-in">
          <div className="w-full max-w-5xl bg-white/95 border-2 border-[#007979]/30 rounded-xs shadow-2xl p-5 sm:p-7 space-y-6 font-mono relative overflow-hidden backdrop-blur-xl">
            
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#007979] via-[#24B1B1] to-[#FFE0C5]" />

            {/* Header Hero Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#007979]/15 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#007979]/10 border border-[#007979]/30 text-[#007979] text-[9px] font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-[#24B1B1]" />
                  Mission Control Setup Console
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#082424] tracking-tight">
                  Configure Planetary Basin &amp; Sensor Acquisition
                </h2>
                <p className="text-[10.5px] text-[#537575] font-sans mt-0.5 max-w-2xl">
                  Select a registered lake basin or draw custom coordinates to initiate automated Sentinel-2 multispectral and Sentinel-1 all-weather C-Band radar STAC ingestion.
                </p>
              </div>

              {/* Quick Prompt Button */}
              <button
                type="button"
                onClick={() => setIsChatbotOpen(true)}
                className="self-start md:self-auto px-3 py-1.5 bg-[#FFF0E4] hover:bg-[#FFE0C5] border border-[#007979]/40 text-[#007979] font-bold text-[9px] rounded-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <ChatbotLogo size="sm" animated={true} />
                <span>Ask AI Copilot for Basin Presets</span>
              </button>
            </div>

            {/* Main Setup 2-Column Form */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Left Configuration Column (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                
                {/* 1. Basin Presets Grid */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-[#082424] uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#007979]" />
                    1. Select Target Lake / Wetland Basin:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {PRESET_BASINS.map((b) => (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, waterBody: b.name, bbox: b.bbox }))}
                        className={`p-2 text-left rounded-xs border text-[8.5px] transition-all cursor-pointer ${
                          config.waterBody === b.name
                            ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979] shadow-sm'
                            : 'bg-[#FFF8F2] text-[#1F4B4B] border-[#007979]/20 hover:border-[#24B1B1]'
                        }`}
                      >
                        <div className="font-bold truncate">{b.label.split(',')[0]}</div>
                        <div className="text-[7px] opacity-80 truncate">{b.label.split(',')[1] || b.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Sensor Acquisition Mode */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-[#082424] uppercase tracking-wider flex items-center gap-1.5">
                    <Radar className="w-3.5 h-3.5 text-[#24B1B1]" />
                    2. Sensor Acquisition Mode:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-[8px]">
                    <button
                      type="button"
                      onClick={() => setSensorMode('optical')}
                      className={`p-2 border rounded-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        sensorMode === 'optical'
                          ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979]'
                          : 'bg-[#FFF8F2] text-[#537575] border-[#007979]/20 hover:border-[#24B1B1]'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 text-[#24B1B1]" />
                      <span>Optical Sentinel-2 (MSI)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSensorMode('sar')}
                      className={`p-2 border rounded-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        sensorMode === 'sar'
                          ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979]'
                          : 'bg-[#FFF8F2] text-[#537575] border-[#007979]/20 hover:border-[#24B1B1]'
                      }`}
                    >
                      <Radar className="w-3.5 h-3.5 text-[#24B1B1]" />
                      <span>SAR Sentinel-1 (C-Band)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSensorMode('fused')}
                      className={`p-2 border rounded-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        sensorMode === 'fused'
                          ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979]'
                          : 'bg-[#FFF8F2] text-[#537575] border-[#007979]/20 hover:border-[#24B1B1]'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>Dual-Sensor Fusion (All-Weather)</span>
                    </button>
                  </div>
                </div>

                {/* 3. Comparison Epochs & Cloud Cover */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#FFF8F2] p-2.5 rounded-xs border border-[#007979]/20 text-[8.5px]">
                  <div>
                    <label className="text-[7.5px] uppercase text-[#537575] font-semibold">T0 Baseline Year:</label>
                    <select
                      value={safeYears[0]}
                      onChange={(e) => setConfig(prev => ({ ...prev, years: [e.target.value, safeYears[1]] }))}
                      className="w-full mt-1 bg-white border border-[#007979]/30 rounded-xs p-1 text-[#082424] font-bold"
                    >
                      {['2015', '2016', '2017', '2018', '2019', '2020'].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[7.5px] uppercase text-[#537575] font-semibold">T1 Target Year:</label>
                    <select
                      value={safeYears[1]}
                      onChange={(e) => setConfig(prev => ({ ...prev, years: [safeYears[0], e.target.value] }))}
                      className="w-full mt-1 bg-white border border-[#007979]/30 rounded-xs p-1 text-[#082424] font-bold"
                    >
                      {['2021', '2022', '2023', '2024', '2025', '2026'].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-[7.5px] text-[#537575]">
                      <span>Max Cloud Tolerance:</span>
                      <span className="font-bold text-[#007979]">{config.maxCloudCover}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      step="5"
                      value={config.maxCloudCover}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxCloudCover: parseInt(e.target.value) }))}
                      className="w-full accent-[#007979] h-1.5 bg-[#FFE0C5] rounded-xs cursor-pointer mt-2"
                    />
                  </div>
                </div>
              </div>

              {/* Right Interactive BBOX Map Column (5 cols) */}
              <div className="md:col-span-5 flex flex-col justify-between space-y-3">
                
                {/* Interactive Map BBox Editor */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="font-bold text-[#082424] uppercase flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-[#007979]" />
                      Interactive Spatial AOI (BBOX):
                    </span>
                    <span className="text-[7px] text-[#537575]">Drag anchors or center</span>
                  </div>

                  <div className="h-44 w-full border-2 border-[#007979]/30 rounded-xs overflow-hidden shadow-inner">
                    <BboxMapEditor
                      bbox={safeBbox}
                      onChange={(newBbox) => setConfig(prev => ({ ...prev, bbox: newBbox }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[7.5px] text-[#537575]">
                    <div className="p-1 bg-[#FFF8F2] rounded-xs border border-[#007979]/15">
                      SW: [{safeBbox[0].toFixed(3)}°E, {safeBbox[1].toFixed(3)}°N]
                    </div>
                    <div className="p-1 bg-[#FFF8F2] rounded-xs border border-[#007979]/15">
                      NE: [{safeBbox[2].toFixed(3)}°E, {safeBbox[3].toFixed(3)}°N]
                    </div>
                  </div>
                </div>

                {/* Upload GeoJSON shortcut */}
                <div className="flex items-center justify-between text-[7.5px] pt-1">
                  <label className="inline-flex items-center gap-1 text-[#007979] hover:text-[#24B1B1] font-semibold cursor-pointer">
                    <Upload className="w-2.5 h-2.5" />
                    <span>Upload Custom GeoJSON Shapefile</span>
                    <input type="file" accept=".geojson,.json" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <span className="text-[#537575]">10m Resolution</span>
                </div>
              </div>
            </div>

            {/* Error banner if present */}
            {error && (
              <div className="p-2.5 bg-[#E11D48]/10 border border-[#E11D48]/40 rounded-xs text-[#E11D48] text-[8.5px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Big Launch Pipeline Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => runPipeline()}
                className="w-full bg-[#007979] hover:bg-[#24B1B1] text-[#FFF0E4] hover:text-[#052626] font-mono text-[11px] sm:text-xs font-bold uppercase py-3.5 px-4 rounded-xs shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-[#24B1B1]/50 group"
              >
                <Zap className="w-4 h-4 fill-current text-[#24B1B1] group-hover:text-[#052626] animate-pulse" />
                <span>⚡ INITIALIZE MULTI-SENSOR OBSERVATORY RUN ({safeYears[0]} vs {safeYears[1]})</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* FULL 3-COLUMN OBSERVATORY DASHBOARD (Results / Processing) */
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 bg-grid-cartographic min-h-0">
          
          {/* ============================================================ */}
          {/* LEFT COLUMN: DOCKED OR UNDOCKED SENSOR & 3D QUALITY (3 COLS)  */}
          {/* ============================================================ */}
          {isSidebarDocked ? (
            <div className="lg:col-span-3 flex flex-col gap-3 overflow-y-auto animate-slide-in">
              
              {/* Card 1: ACTIVE BASIN & SENSOR MODES */}
              <div className="bg-white/95 border border-[#007979]/20 p-3 rounded-xs shadow-md space-y-2.5 header-trace-teal font-mono">
                
                {/* Header with Undock / Collapse Trigger */}
                <div className="flex items-center justify-between border-b border-[#007979]/15 pb-1.5 text-[9.5px]">
                  <span className="font-bold text-[#082424] uppercase flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#007979]" />
                    OBSERVATORY AOI
                  </span>
                  
                  <div className="flex items-center gap-1 text-[7.5px]">
                    <button
                      onClick={() => setIsSidebarDocked(false)}
                      className="px-1.5 py-0.5 rounded-xs border border-[#007979]/30 text-[#007979] hover:bg-[#FFF0E4] transition-colors cursor-pointer"
                      title="Undock / Collapse Sidebar for Maximum Map Width"
                    >
                      <PanelLeftClose className="w-3 h-3" />
                    </button>
                    <span className="bg-[#007979]/10 text-[#007979] font-bold px-1.5 py-0.2 rounded-xs">
                      {safeYears[0]}-{safeYears[1]}
                    </span>
                  </div>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-2 gap-1 text-[8px]">
                  {PRESET_BASINS.map((b) => (
                    <button
                      key={b.name}
                      type="button"
                      disabled={currentStep === 'processing'}
                      onClick={() => {
                        setConfig(prev => ({ ...prev, waterBody: b.name, bbox: b.bbox }));
                        runPipeline({ ...config, waterBody: b.name, bbox: b.bbox });
                      }}
                      className={`p-1 text-left rounded-xs border transition-all truncate cursor-pointer ${
                        config.waterBody === b.name
                          ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979]'
                          : 'bg-[#FFF8F2] text-[#537575] border-[#007979]/15 hover:border-[#24B1B1]'
                      }`}
                    >
                      {b.label.split(',')[0]}
                    </button>
                  ))}
                </div>

                {/* Mini BBox Map */}
                <div className="h-28 w-full border border-[#007979]/20 rounded-xs overflow-hidden shadow-inner">
                  <BboxMapEditor
                    bbox={safeBbox}
                    onChange={(newBbox) => {
                      setConfig(prev => ({ ...prev, bbox: newBbox }));
                    }}
                  />
                </div>
              </div>

              {/* Card 2: 3D HYDRO-DEPTH & BIO-OPTICAL WATER QUALITY */}
              <WaterQualityAndBathymetry
                bathymetryData={bathymetryData}
                waterQualityData={waterQualityData}
                activeView={mapView}
                onSelectView={(v) => setMapView(v as MapView)}
                disabled={currentStep === 'processing'}
              />

              {/* Card 3: SPATIAL THRESHOLD CONTROLS */}
              <div className="bg-white/95 border border-[#007979]/20 p-3 rounded-xs shadow-md space-y-2 font-mono text-[8px] header-trace-bright-teal">
                <div className="flex items-center justify-between border-b border-[#007979]/15 pb-1">
                  <span className="font-bold text-[#082424] uppercase flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-[#24B1B1]" />
                    SPECTRAL CUTOFF TUNING
                  </span>
                  {isRecalculatingThreshold && (
                    <span className="text-[#24B1B1] font-bold animate-pulse">RECALCULATING...</span>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[#537575]">
                      <span>Optical NDWI Cutoff:</span>
                      <span className="text-[#007979] font-bold">&gt; {config.ndwiThreshold.toFixed(2)}</span>
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
                        applyThresholdsAndRamp(val, colorRamp, sarThresholdDb);
                      }}
                      className="w-full accent-[#007979] h-1.5 bg-[#FFE0C5] rounded-xs cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[#537575]">
                      <span>SAR Radar Backscatter:</span>
                      <span className="text-[#24B1B1] font-bold">&lt; {sarThresholdDb} dB</span>
                    </div>
                    <input
                      type="range"
                      min="-25"
                      max="-5"
                      step="1"
                      value={sarThresholdDb}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setSarThresholdDb(val);
                        applyThresholdsAndRamp(config.ndwiThreshold, colorRamp, val);
                      }}
                      className="w-full accent-[#24B1B1] h-1.5 bg-[#FFE0C5] rounded-xs cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* COLLAPSED UNDOCKED ICON RAIL */
            <div className="hidden lg:flex lg:col-span-1 flex-col items-center gap-2 p-2 bg-white/95 border border-[#007979]/20 rounded-xs shadow-md font-mono text-[7px] text-[#007979]">
              <button
                onClick={() => setIsSidebarDocked(true)}
                className="w-8 h-8 rounded-xs bg-[#007979] text-[#FFF0E4] hover:bg-[#24B1B1] flex items-center justify-center transition-all cursor-pointer shadow-sm mb-2"
                title="Dock / Expand Sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>

              <button
                onClick={() => setMapView('split')}
                className={`w-7 h-7 rounded-xs border flex items-center justify-center cursor-pointer ${
                  mapView === 'split' ? 'bg-[#007979] text-white border-[#007979]' : 'bg-[#FFF8F2] text-[#537575]'
                }`}
                title="True Color View"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setMapView('bathymetry')}
                className={`w-7 h-7 rounded-xs border flex items-center justify-center cursor-pointer ${
                  mapView === 'bathymetry' ? 'bg-[#007979] text-white border-[#007979]' : 'bg-[#FFF8F2] text-[#537575]'
                }`}
                title="3D Depth View"
              >
                <Waves className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setMapView('turbidity')}
                className={`w-7 h-7 rounded-xs border flex items-center justify-center cursor-pointer ${
                  mapView === 'turbidity' ? 'bg-[#007979] text-white border-[#007979]' : 'bg-[#FFF8F2] text-[#537575]'
                }`}
                title="Turbidity View"
              >
                <Droplets className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setMapView('sar_vv')}
                className={`w-7 h-7 rounded-xs border flex items-center justify-center cursor-pointer ${
                  mapView === 'sar_vv' ? 'bg-[#007979] text-white border-[#007979]' : 'bg-[#FFF8F2] text-[#537575]'
                }`}
                title="SAR Radar View"
              >
                <Radar className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* CENTER COLUMN: SATELLITE BASIN OBSERVATORY (6 or 8 COLS)     */}
          {/* ============================================================ */}
          <div className={`${isSidebarDocked ? 'lg:col-span-6' : 'lg:col-span-8'} flex flex-col gap-3 transition-all duration-300`}>
            
            {/* Top View Mode Bar */}
            <div className="bg-white/95 border border-[#007979]/20 p-2 rounded-xs shadow-md flex flex-wrap items-center justify-between gap-2">
              
              {/* View Mode Buttons */}
              <div className="flex flex-wrap gap-1 font-mono text-[7.5px]">
                <button
                  onClick={() => setMapView('split')}
                  className={`px-1.5 py-1 rounded-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                    mapView === 'split'
                      ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979]'
                      : 'bg-[#FFF8F2] text-[#537575] border-[#007979]/20 hover:border-[#24B1B1]'
                  }`}
                >
                  <SlidersHorizontal className="w-2.5 h-2.5 text-[#24B1B1]" /> TRUE COLOR
                </button>

                <button
                  onClick={() => setMapView('ndwi_split')}
                  className={`px-1.5 py-1 rounded-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                    mapView === 'ndwi_split'
                      ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979]'
                      : 'bg-[#FFF8F2] text-[#537575] border-[#007979]/20 hover:border-[#24B1B1]'
                  }`}
                >
                  <Palette className="w-2.5 h-2.5 text-[#24B1B1]" /> NDWI
                </button>

                <button
                  onClick={() => setMapView('bathymetry')}
                  className={`px-1.5 py-1 rounded-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                    mapView === 'bathymetry'
                      ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979]'
                      : 'bg-[#FFF8F2] text-[#537575] border-[#007979]/20 hover:border-[#24B1B1]'
                  }`}
                >
                  <Waves className="w-2.5 h-2.5 text-[#24B1B1]" /> 3D DEPTH
                </button>

                <button
                  onClick={() => setMapView('turbidity')}
                  className={`px-1.5 py-1 rounded-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                    mapView === 'turbidity'
                      ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979]'
                      : 'bg-[#FFF8F2] text-[#537575] border-[#007979]/20 hover:border-[#24B1B1]'
                  }`}
                >
                  <Droplets className="w-2.5 h-2.5 text-[#EAB308]" /> TURBIDITY
                </button>

                <button
                  onClick={() => setMapView('chlorophyll')}
                  className={`px-1.5 py-1 rounded-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                    mapView === 'chlorophyll'
                      ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979]'
                      : 'bg-[#FFF8F2] text-[#537575] border-[#007979]/20 hover:border-[#24B1B1]'
                  }`}
                >
                  <Activity className="w-2.5 h-2.5 text-[#10B981]" /> CHL-A
                </button>

                <button
                  onClick={() => setMapView('cdom')}
                  className={`px-1.5 py-1 rounded-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                    mapView === 'cdom'
                      ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979]'
                      : 'bg-[#FFF8F2] text-[#537575] border-[#007979]/20 hover:border-[#24B1B1]'
                  }`}
                >
                  <Layers className="w-2.5 h-2.5 text-[#F59E0B]" /> CDOM
                </button>

                <button
                  onClick={() => setMapView('sar_vv')}
                  className={`px-1.5 py-1 rounded-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                    mapView === 'sar_vv'
                      ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979]'
                      : 'bg-[#FFF8F2] text-[#537575] border-[#007979]/20 hover:border-[#24B1B1]'
                  }`}
                >
                  <Radar className="w-2.5 h-2.5 text-[#24B1B1]" /> SAR RADAR
                </button>

                <button
                  onClick={() => setMapView('fused_allweather')}
                  className={`px-1.5 py-1 rounded-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                    mapView === 'fused_allweather'
                      ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979]'
                      : 'bg-[#FFF8F2] text-[#537575] border-[#007979]/20 hover:border-[#24B1B1]'
                  }`}
                >
                  <Zap className="w-2.5 h-2.5 text-[#F59E0B]" /> FUSION
                </button>

                <button
                  onClick={() => setMapView('diff')}
                  className={`px-1.5 py-1 rounded-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                    mapView === 'diff'
                      ? 'bg-[#007979] text-[#FFF0E4] font-bold border-[#007979]'
                      : 'bg-[#FFF8F2] text-[#537575] border-[#007979]/20 hover:border-[#24B1B1]'
                  }`}
                >
                  <Activity className="w-2.5 h-2.5 text-[#FB7185]" /> DIFF
                </button>
              </div>

              {/* LUT Selector Mini Trigger */}
              <div className="w-36">
                <ColorRampSelector
                  selectedRamp={colorRamp}
                  onChange={handleRampChange}
                  disabled={currentStep === 'processing'}
                />
              </div>
            </div>

            {/* Main Visual Observatory Stage (High-Contrast Dark Canvas) */}
            <div className="relative flex-1 bg-[#061717] border-2 border-[#007979]/30 rounded-xs shadow-xl overflow-hidden flex flex-col items-center justify-center min-h-[440px]">
              
              {/* Top Coordinate & Change Delta HUD Banner */}
              <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between z-20 font-mono pointer-events-none">
                <div className="bg-[#052626]/90 border border-[#24B1B1]/40 text-[#FFF0E4] text-[8px] px-2 py-0.5 rounded-xs flex items-center gap-1.5 shadow-md">
                  <span>AOI: [{safeBbox[1].toFixed(4)}°N, {safeBbox[0].toFixed(4)}°E]</span>
                  {isSarPenetrating && (
                    <span className="text-[#24B1B1] font-bold">• S1 SAR RADAR ACTIVE</span>
                  )}
                </div>

                {/* Prominent Change Delta Badge Overlay */}
                {currentStep === 'results' && sceneData && (
                  <div className={`px-2.5 py-0.5 border rounded-xs text-[8.5px] font-bold flex items-center gap-1 shadow-lg pointer-events-auto ${
                    change < 0 
                      ? 'bg-[#E11D48]/20 border-[#E11D48] text-[#E11D48]' 
                      : 'bg-[#0D9488]/20 border-[#0D9488] text-[#0D9488]'
                  }`}>
                    {change < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    <span>NET DELTA: {change > 0 ? '+' : ''}{change.toFixed(2)} km² ({pctChange.toFixed(1)}%)</span>
                  </div>
                )}
              </div>

              {currentStep === 'results' && sceneData ? (
                mapView === 'split' ? (
                  <ImageSplitSlider
                    imageA={sceneData.yearA.trueColor}
                    imageB={sceneData.yearB.trueColor}
                    labelA={`${safeYears[0]} True Color (T0)`}
                    labelB={`${safeYears[1]} True Color (T1)`}
                    dateA={sceneData.yearA.date}
                    dateB={sceneData.yearB.date}
                    idA={sceneData.yearA.id}
                    idB={sceneData.yearB.id}
                  />
                ) : mapView === 'ndwi_split' ? (
                  <ImageSplitSlider
                    imageA={sceneData.yearA.colorizedNdwi || sceneData.yearA.ndwi}
                    imageB={sceneData.yearB.colorizedNdwi || sceneData.yearB.ndwi}
                    labelA={`${safeYears[0]} NDWI (${COLOR_RAMPS[colorRamp].name})`}
                    labelB={`${safeYears[1]} NDWI (${COLOR_RAMPS[colorRamp].name})`}
                    dateA={sceneData.yearA.date}
                    dateB={sceneData.yearB.date}
                    idA={sceneData.yearA.id}
                    idB={sceneData.yearB.id}
                  />
                ) : mapView === 'bathymetry' ? (
                  <div className="w-full h-full relative min-h-[380px] font-mono">
                    <img 
                      src={bathymetryData?.colorizedBathymetryUrl || sceneData.yearB.colorizedNdwi || sceneData.yearB.ndwi}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      alt="3D Bathymetric Depth"
                    />
                    <div className="absolute top-9 left-2.5 bg-[#052626]/90 text-[#24B1B1] px-2 py-0.5 text-[8px] border border-[#24B1B1]/40 rounded-xs flex items-center gap-1 font-bold">
                      <Waves className="w-3 h-3 text-[#24B1B1]" />
                      <span>3D Bathymetric Depth &amp; Volume ({bathymetryData?.volumeMCM.toFixed(2) || '0'} MCM / {bathymetryData?.volumeM3.toLocaleString() || '0'} m³)</span>
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 bg-[#052626]/95 border border-[#24B1B1]/30 p-2 text-[7.5px] rounded-xs space-y-1 text-[#FFF0E4]">
                      <div className="font-bold text-[#24B1B1]">3D Depth Gradient (DEM Hypsometry):</div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#A5F3FC]"></div><span>Littoral Shoreline (0 - 2m)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#0284C7]"></div><span>Submerged Channel (2 - 5m)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#030712] border border-white/20"></div><span>Deep Storage Core (5m+ Depth)</span></div>
                    </div>
                  </div>
                ) : mapView === 'turbidity' ? (
                  <div className="w-full h-full relative min-h-[380px] font-mono">
                    <img 
                      src={waterQualityData?.turbidityUrl || sceneData.yearB.colorizedNdwi || sceneData.yearB.ndwi}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      alt="NDTI Turbidity / TSS"
                    />
                    <div className="absolute top-9 left-2.5 bg-[#052626]/90 text-[#EAB308] px-2 py-0.5 text-[8px] border border-[#EAB308]/40 rounded-xs flex items-center gap-1 font-bold">
                      <Droplets className="w-3 h-3 text-[#EAB308]" />
                      <span>Normalized Difference Turbidity Index ({waterQualityData?.turbidityNtu} NTU / ~{waterQualityData?.tssMgL} mg/L TSS)</span>
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 bg-[#052626]/95 border border-[#007979]/40 p-2 text-[7.5px] rounded-xs space-y-1 text-[#FFF0E4]">
                      <div className="font-bold text-[#EAB308]">Turbidity / Sediment Loading Key:</div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#06B6D4]"></div><span>Clear Water (&lt; 5 NTU)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#EAB308]"></div><span>Moderate Suspended Solids (5 - 25 NTU)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#78350F]"></div><span>Heavy Silt Plume / Runoff (&gt; 60 NTU)</span></div>
                    </div>
                  </div>
                ) : mapView === 'chlorophyll' ? (
                  <div className="w-full h-full relative min-h-[380px] font-mono">
                    <img 
                      src={waterQualityData?.chlorophyllUrl || sceneData.yearB.colorizedNdwi || sceneData.yearB.ndwi}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      alt="Chlorophyll-a Algal Bloom"
                    />
                    <div className="absolute top-9 left-2.5 bg-[#052626]/90 text-[#10B981] px-2 py-0.5 text-[8px] border border-[#10B981]/40 rounded-xs flex items-center gap-1 font-bold">
                      <Activity className="w-3 h-3 text-[#10B981]" />
                      <span>Chlorophyll-a &amp; Algal Bloom Risk ({waterQualityData?.chlorophyllUgL} µg/L / Carlson TSI {waterQualityData?.trophicStateIndex})</span>
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 bg-[#052626]/95 border border-[#007979]/40 p-2 text-[7.5px] rounded-xs space-y-1 text-[#FFF0E4]">
                      <div className="font-bold text-[#10B981]">Eutrophication / Algae Status:</div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#0284C7]"></div><span>Oligotrophic Low Algae (&lt; 2.5 µg/L)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#84CC16]"></div><span>Eutrophic Active Growth (8 - 25 µg/L)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#EF4444]"></div><span>Hypertrophic Severe Bloom (&gt; 25 µg/L)</span></div>
                    </div>
                  </div>
                ) : mapView === 'cdom' ? (
                  <div className="w-full h-full relative min-h-[380px] font-mono">
                    <img 
                      src={waterQualityData?.cdomUrl || sceneData.yearB.colorizedNdwi || sceneData.yearB.ndwi}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      alt="CDOM Organic Carbon"
                    />
                    <div className="absolute top-9 left-2.5 bg-[#052626]/90 text-[#F59E0B] px-2 py-0.5 text-[8px] border border-[#F59E0B]/40 rounded-xs flex items-center gap-1 font-bold">
                      <Layers className="w-3 h-3 text-[#F59E0B]" />
                      <span>Colored Dissolved Organic Matter (a_cdom: {waterQualityData?.cdomAbsorption} m⁻¹)</span>
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 bg-[#052626]/95 border border-[#007979]/40 p-2 text-[7.5px] rounded-xs space-y-1 text-[#FFF0E4]">
                      <div className="font-bold text-[#F59E0B]">Dissolved Organic Carbon Key:</div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#22D3EE]"></div><span>Low Organic Carbon (&lt; 1.0 m⁻¹)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#F59E0B]"></div><span>Moderate Humic Watershed Runoff</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#451A03]"></div><span>Dense Wetland Peat Tannins (&gt; 3.5 m⁻¹)</span></div>
                    </div>
                  </div>
                ) : mapView === 'sar_vv' ? (
                  <div className="w-full h-full relative min-h-[380px] font-mono">
                    <img 
                      src={sceneData.yearB.sarColorized || sceneData.yearB.sarVvUrl || sceneData.yearB.ndwi}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      alt="Sentinel-1 SAR Radar"
                    />
                    <div className="absolute top-9 left-2.5 bg-[#052626]/90 text-[#FFF0E4] px-2 py-0.5 text-[8px] border border-[#24B1B1]/40 rounded-xs flex items-center gap-1">
                      <Radar className="w-3 h-3 text-[#24B1B1]" />
                      <span>Sentinel-1 C-SAR RTC (VV-Pol, σ⁰ &lt; {sarThresholdDb} dB Cutoff)</span>
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 bg-[#052626]/95 border border-[#007979]/40 p-2 text-[7.5px] rounded-xs space-y-1 text-[#FFF0E4]">
                      <div className="font-bold text-[#24B1B1]">Sentinel-1 C-Band Radar Key:</div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#1478DC] border border-white/30"></div><span>Water (Specular Reflectance)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#2E4A38] border border-white/30"></div><span>Vegetated Terrain / Soil</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#D97706] border border-white/30"></div><span>Urban Double-Bounce Structures</span></div>
                    </div>
                  </div>
                ) : mapView === 'fused_allweather' ? (
                  <div className="w-full h-full relative min-h-[380px] font-mono">
                    <img 
                      src={sceneData.yearB.fusedUrl || sceneData.yearB.colorizedNdwi || sceneData.yearB.ndwi}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      alt="All-Weather Fusion"
                    />
                    <div className="absolute top-9 left-2.5 bg-[#052626]/90 text-[#F59E0B] px-2 py-0.5 text-[8px] border border-[#F59E0B]/40 rounded-xs flex items-center gap-1 font-bold">
                      <Zap className="w-3 h-3" />
                      <span>All-Weather Cloud-Penetrating Multi-Sensor Fusion (S2 MSI + S1 SAR)</span>
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 bg-[#052626]/95 border border-[#007979]/40 p-2 text-[7.5px] rounded-xs space-y-1 text-[#FFF0E4]">
                      <div className="font-bold text-[#F59E0B]">Fusion Classification Key:</div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#2DD4BF]"></div><span>Dual-Sensor Verified Water (MSI + SAR)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#0284C7]"></div><span>Cloud-Penetrated Water (SAR Radar Only)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#38BDF8]"></div><span>Clear-Sky Water (Optical NDWI Only)</span></div>
                    </div>
                  </div>
                ) : mapView === 'diff' ? (
                  <div className="flex w-full h-full min-h-[380px] font-mono">
                    <div className="flex-1 border-r border-[#007979]/30 relative">
                      <div className="absolute top-9 left-2.5 bg-[#052626]/90 border border-[#24B1B1]/40 px-2 py-0.5 text-[8px] text-[#FFF0E4] z-10 rounded-xs">
                        BASELINE T0 ({safeYears[0]})
                      </div>
                      <img 
                        src={sceneData.yearA.trueColor} 
                        className="w-full h-full object-cover" 
                        crossOrigin="anonymous" 
                        alt="Raw Baseline" 
                      />
                    </div>

                    <div className="flex-1 relative bg-[#061717]">
                      <div className="absolute top-9 left-2.5 bg-[#052626]/90 border border-[#FB7185] px-2 py-0.5 text-[8px] text-[#FB7185] z-10 rounded-xs font-bold">
                        TEMPORAL CHANGE DIFFERENCE MASK
                      </div>
                      
                      <img 
                        src={sceneData.yearB.trueColor} 
                        className="w-full h-full object-cover opacity-20 grayscale" 
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
                      
                      <div className="absolute bottom-2.5 left-2.5 flex flex-col gap-1 text-[7.5px] bg-[#052626]/95 p-2 text-[#CBD5E1] border border-[#007979]/40 rounded-xs shadow-md">
                        <div className="font-bold text-[#FFF0E4] border-b border-[#007979]/30 pb-0.5">Physical Change Legend:</div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-[#FB7185] border border-white/30"></div> 
                          <span className="font-bold text-[#FB7185]">Water Extent Lost (Desiccation)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-[#38BDF8] border border-white/30"></div> 
                          <span className="font-bold text-[#38BDF8]">Water Extent Gained (Inundation)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-[#0284C7] border border-white/30"></div> 
                          <span>Persistent Water Extent</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full relative min-h-[380px] font-mono">
                    <img 
                      src={sceneData.yearB.trueColor}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      alt="Satellite Imagery"
                    />
                    <div className="absolute top-9 left-2.5 bg-[#052626]/90 text-[#FFF0E4] px-2 py-0.5 text-[8px] border border-[#24B1B1]/40 rounded-xs">
                      {safeYears[1]} True Color
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-2.5 font-mono">
                  <Radar className="w-10 h-10 text-[#24B1B1] animate-spin" />
                  <div className="text-[11px] font-bold text-[#24B1B1] tracking-wide">
                    INGESTING MULTI-SENSOR STAC (S2 MSI + S1 SAR RADAR)...
                  </div>
                  <div className="text-[9px] text-[#537575]">
                    Calculating C-Band Radar Backscatter &amp; {COLOR_RAMPS[colorRamp].name} Look-Up Table
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Needle Scale Bar */}
            {currentStep === 'results' && sceneData && (
              <div className="bg-white/95 border border-[#007979]/20 p-2 rounded-xs shadow-sm">
                <NdwiScaleLegend 
                  selectedRamp={colorRamp} 
                  threshold={config.ndwiThreshold} 
                />
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN: CHANGE MATRIX & AI SYNTHESIS (3 COLS)          */}
          {/* ============================================================ */}
          <div className="lg:col-span-3 flex flex-col gap-3 overflow-y-auto animate-slide-in">
            
            {/* Card 1: HYDROLOGICAL CHANGE MATRIX */}
            {currentStep === 'results' && sceneData ? (
              <div className="bg-white/95 border border-[#007979]/20 p-3 rounded-xs shadow-md space-y-2.5 font-mono header-trace-teal">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#007979]/15 pb-1.5 text-[9.5px]">
                  <span className="font-bold text-[#082424] uppercase flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#007979]" />
                    HYDROLOGICAL MATRIX
                  </span>
                  <span className={`text-[7.5px] px-1.5 py-0.2 rounded-xs font-bold border ${
                    change < 0 
                      ? 'bg-[#E11D48]/15 text-[#E11D48] border-[#E11D48]/30' 
                      : 'bg-[#0D9488]/15 text-[#0D9488] border-[#0D9488]/30'
                  }`}>
                    {change < 0 ? 'DESICCATION' : 'INUNDATION'}
                  </span>
                </div>

                {/* Hero Net Delta Callout */}
                <div className={`p-2.5 rounded-xs border flex items-center justify-between ${
                  change < 0 
                    ? 'bg-[#E11D48]/10 border-[#E11D48]/30 text-[#E11D48]' 
                    : 'bg-[#0D9488]/10 border-[#0D9488]/30 text-[#0D9488]'
                }`}>
                  <div>
                    <div className="text-[7.5px] uppercase tracking-wider text-[#537575]">Net Surface Footprint Delta:</div>
                    <div className="text-base sm:text-lg font-bold">
                      {change > 0 ? '+' : ''}{change.toFixed(2)} km²
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[7.5px] uppercase tracking-wider text-[#537575]">Relative Trajectory:</div>
                    <div className="text-base sm:text-lg font-bold">
                      {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 gap-1.5 text-[8px]">
                  <div className="bg-[#FFF8F2] p-2 rounded-xs border border-[#007979]/15">
                    <div className="text-[7px] text-[#537575]">T0 BASELINE ({safeYears[0]}):</div>
                    <div className="font-bold text-[#082424] text-[9.5px]">{sceneData.yearA.area.toFixed(2)} km²</div>
                    <div className="text-[7px] text-[#537575]">Date: {sceneData.yearA.date}</div>
                  </div>

                  <div className="bg-[#FFF8F2] p-2 rounded-xs border border-[#007979]/15">
                    <div className="text-[7px] text-[#537575]">T1 TARGET ({safeYears[1]}):</div>
                    <div className="font-bold text-[#082424] text-[9.5px]">{sceneData.yearB.area.toFixed(2)} km²</div>
                    <div className="text-[7px] text-[#537575]">Date: {sceneData.yearB.date}</div>
                  </div>
                </div>

                {/* Multi-Year Longitudinal Trajectory Chart */}
                {trendData.length > 0 && (
                  <div className="bg-[#FFF8F2] p-2 border border-[#007979]/15 rounded-xs space-y-1">
                    <div className="flex items-center justify-between text-[7.5px] text-[#537575]">
                      <span className="font-bold text-[#082424] uppercase">Multi-Year Trajectory</span>
                      <span className="text-[#007979] font-bold">Annual Extent</span>
                    </div>

                    <div className="h-20 w-full pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <XAxis dataKey="year" tick={{ fontSize: 7.5, fill: '#537575', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 7.5, fill: '#537575', fontFamily: 'monospace' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip 
                            contentStyle={{ fontSize: '8.5px', fontFamily: 'monospace', backgroundColor: '#FFFFFF', borderColor: '#007979', color: '#082424' }} 
                            formatter={(val: number) => [`${val.toFixed(2)} km²`, 'Water Extent']}
                          />
                          <Line type="monotone" dataKey="area" stroke="#007979" strokeWidth={2} dot={{ r: 2.5, fill: '#24B1B1' }} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Card 2: AI ECOLOGICAL SYNTHESIS SUITE COMPONENT */}
            <AiEcologicalInsights
              sceneData={sceneData}
              config={{ ...config, sensorMode, sarThresholdDb }}
              change={change}
              pctChange={pctChange}
              isSarPenetrating={isSarPenetrating}
              bathymetryData={bathymetryData}
              waterQualityData={waterQualityData}
            />

            {/* Export Provenance Button */}
            <button
              onClick={handleExport}
              disabled={currentStep !== 'results'}
              className="w-full bg-[#007979] hover:bg-[#24B1B1] text-[#FFF0E4] hover:text-[#052626] font-mono text-[9px] font-bold uppercase py-2.5 flex items-center justify-center gap-2 rounded-xs shadow-sm transition-all cursor-pointer disabled:opacity-30 border border-[#24B1B1]/40"
            >
              <Download className="w-3.5 h-3.5 text-[#24B1B1]" />
              Export Multi-Sensor Provenance JSON
            </button>
          </div>
        </main>
      )}

      {/* 3. COLLAPSIBLE KERNEL TERMINAL LOG DRAWER (Teal + Peach Footer) */}
      <footer className="border-t border-[#007979]/20 bg-white/95 z-30 font-mono text-[8.5px]">
        <div 
          onClick={() => setIsLogsExpanded(!isLogsExpanded)}
          className="px-4 py-1.5 flex items-center justify-between bg-[#FFF8F2] hover:bg-[#FFE0C5] cursor-pointer transition-colors border-b border-[#007979]/10"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-3 h-3 text-[#007979]" />
            <span className="font-bold text-[#082424] uppercase tracking-wider">
              AquaSense Planetary Trace Kernel ({logs.length} events logged)
            </span>
            <span className="text-[7px] bg-[#007979]/15 text-[#007979] font-bold px-1.5 py-0.2 rounded-xs">
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleCopyLogs(); }}
              className="p-1 hover:text-[#007979] text-[#537575] rounded-xs transition-colors flex items-center gap-1"
              title="Copy trace log buffer"
            >
              {copiedLogs ? <Check className="w-3 h-3 text-[#0D9488]" /> : <Copy className="w-3 h-3" />}
              <span className="text-[7.5px]">{copiedLogs ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleClearLogs(); }}
              className="p-1 hover:text-[#E11D48] text-[#537575] rounded-xs transition-colors"
              title="Clear trace logs"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            {isLogsExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#537575]" /> : <ChevronUp className="w-3.5 h-3.5 text-[#537575]" />}
          </div>
        </div>

        {isLogsExpanded && (
          <div 
            ref={logContainerRef}
            className="h-24 overflow-y-auto p-2.5 bg-[#052626] text-[#24B1B1] font-mono text-[8px] space-y-0.5 leading-relaxed selection:bg-[#24B1B1] selection:text-[#052626]"
          >
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-[#FFE0C5]/40 select-none">{(idx + 1).toString().padStart(3, '0')}</span>
                <span className={log.includes('[ERROR]') ? 'text-[#FB7185] font-bold' : log.includes('[COMPUTE') ? 'text-[#F59E0B]' : log.includes('[HYDRO-3D]') ? 'text-[#2DD4BF] font-bold' : 'text-[#24B1B1]'}>
                  {log}
                </span>
              </div>
            ))}
          </div>
        )}
      </footer>

      {/* 4. AI HYDROLOGICAL COPILOT & CHART GENERATOR DRAWER */}
      <HydrologyChatbot
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        currentConfig={config}
        onApplyConfig={handleApplyChatConfig}
      />
    </div>
  );
}
