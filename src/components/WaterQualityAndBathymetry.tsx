import React, { useState } from 'react';
import { 
  Waves, 
  Droplets, 
  Layers, 
  Activity, 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  BarChart3, 
  Compass, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Eye, 
  Info,
  ShieldAlert,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { BathymetryResult, WaterQualityResult } from '../utils/rasterAnalysis';

interface WaterQualityAndBathymetryProps {
  bathymetryData: BathymetryResult | null;
  waterQualityData: WaterQualityResult | null;
  activeView: string;
  onSelectView: (view: string) => void;
  disabled?: boolean;
}

export function WaterQualityAndBathymetry({
  bathymetryData,
  waterQualityData,
  activeView,
  onSelectView,
  disabled = false
}: WaterQualityAndBathymetryProps) {
  const [activeTab, setActiveTab] = useState<'volume' | 'water_quality' | 'hypsometry'>('volume');

  if (!bathymetryData && !waterQualityData) {
    return (
      <div className="bg-white/95 border border-[#007979]/20 p-3 rounded-xs shadow-md font-mono text-[8.5px] space-y-2 header-trace-teal">
        <div className="flex items-center justify-between border-b border-[#007979]/15 pb-1.5 text-[9.5px]">
          <span className="font-bold text-[#082424] uppercase flex items-center gap-1.5">
            <Waves className="w-3.5 h-3.5 text-[#007979]" />
            3D BATHYMETRY &amp; WATER QUALITY
          </span>
          <span className="text-[7.5px] bg-[#007979]/10 text-[#007979] px-1.5 py-0.2 rounded-xs font-bold border border-[#007979]/20">
            STANDBY
          </span>
        </div>
        <div className="p-3 text-center text-[#537575] leading-relaxed">
          Initialize pipeline to compute 3D volumetric retention ($m^3$) and bio-optical water quality indices (Turbidity, Chlorophyll-a, CDOM).
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 border border-[#007979]/20 p-3 rounded-xs shadow-md font-mono space-y-2.5 header-trace-teal">
      
      {/* Header with Tab Navigation */}
      <div className="flex items-center justify-between border-b border-[#007979]/15 pb-1.5 text-[9.5px]">
        <span className="font-bold text-[#082424] uppercase flex items-center gap-1.5">
          <Waves className="w-3.5 h-3.5 text-[#007979]" />
          3D HYDRO &amp; BIO-OPTICS
        </span>
        <div className="flex items-center gap-1 text-[7.5px]">
          <button
            onClick={() => setActiveTab('volume')}
            className={`px-1.5 py-0.5 rounded-xs border transition-colors cursor-pointer ${
              activeTab === 'volume'
                ? 'bg-[#007979] border-[#007979] text-[#FFF0E4] font-bold'
                : 'bg-[#FFF8F2] border-[#007979]/20 text-[#537575] hover:text-[#082424]'
            }`}
          >
            3D VOLUME ($m^3$)
          </button>
          <button
            onClick={() => setActiveTab('water_quality')}
            className={`px-1.5 py-0.5 rounded-xs border transition-colors cursor-pointer ${
              activeTab === 'water_quality'
                ? 'bg-[#007979] border-[#007979] text-[#FFF0E4] font-bold'
                : 'bg-[#FFF8F2] border-[#007979]/20 text-[#537575] hover:text-[#082424]'
            }`}
          >
            WATER QUALITY
          </button>
          <button
            onClick={() => setActiveTab('hypsometry')}
            className={`px-1.5 py-0.5 rounded-xs border transition-colors cursor-pointer ${
              activeTab === 'hypsometry'
                ? 'bg-[#007979] border-[#007979] text-[#FFF0E4] font-bold'
                : 'bg-[#FFF8F2] border-[#007979]/20 text-[#537575] hover:text-[#082424]'
            }`}
          >
            HYPSOMETRIC
          </button>
        </div>
      </div>

      {/* Layer View Triggers */}
      <div className="space-y-1 font-mono text-[8px]">
        <span className="text-[#537575] uppercase font-bold text-[7.5px] tracking-wider">
          Overlay Bio-Optical / 3D Depth Layer:
        </span>
        <div className="grid grid-cols-4 gap-1 text-[7.5px]">
          <button
            type="button"
            onClick={() => onSelectView('bathymetry')}
            className={`py-1 px-1 border rounded-xs transition-colors flex flex-col items-center gap-0.5 cursor-pointer ${
              activeView === 'bathymetry'
                ? 'bg-[#007979] border-[#007979] text-[#FFF0E4] font-bold'
                : 'bg-[#FFF8F2] border-[#007979]/20 text-[#537575] hover:border-[#24B1B1]'
            }`}
          >
            <Waves className="w-2.5 h-2.5 text-[#24B1B1]" />
            <span>3D Depth</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('turbidity')}
            className={`py-1 px-1 border rounded-xs transition-colors flex flex-col items-center gap-0.5 cursor-pointer ${
              activeView === 'turbidity'
                ? 'bg-[#007979] border-[#007979] text-[#FFF0E4] font-bold'
                : 'bg-[#FFF8F2] border-[#007979]/20 text-[#537575] hover:border-[#24B1B1]'
            }`}
          >
            <Droplets className="w-2.5 h-2.5 text-[#EAB308]" />
            <span>Turbidity</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('chlorophyll')}
            className={`py-1 px-1 border rounded-xs transition-colors flex flex-col items-center gap-0.5 cursor-pointer ${
              activeView === 'chlorophyll'
                ? 'bg-[#007979] border-[#007979] text-[#FFF0E4] font-bold'
                : 'bg-[#FFF8F2] border-[#007979]/20 text-[#537575] hover:border-[#24B1B1]'
            }`}
          >
            <Activity className="w-2.5 h-2.5 text-[#10B981]" />
            <span>Chl-a Algae</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('cdom')}
            className={`py-1 px-1 border rounded-xs transition-colors flex flex-col items-center gap-0.5 cursor-pointer ${
              activeView === 'cdom'
                ? 'bg-[#007979] border-[#007979] text-[#FFF0E4] font-bold'
                : 'bg-[#FFF8F2] border-[#007979]/20 text-[#537575] hover:border-[#24B1B1]'
            }`}
          >
            <Layers className="w-2.5 h-2.5 text-[#F59E0B]" />
            <span>CDOM Carbon</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: 3D BATHYMETRIC VOLUME ESTIMATION                      */}
      {/* ============================================================ */}
      {activeTab === 'volume' && bathymetryData && (
        <div className="space-y-2 text-[8.5px]">
          
          {/* Main Volumetric Callout */}
          <div className="p-2.5 bg-[#FFF8F2] border border-[#007979]/30 rounded-xs flex items-center justify-between">
            <div>
              <div className="text-[7.5px] uppercase tracking-wider text-[#537575]">
                Estimated 3D Water Volume:
              </div>
              <div className="text-base sm:text-lg font-black text-[#007979]">
                {bathymetryData.volumeMCM.toFixed(2)} <span className="text-[10px] text-[#537575]">MCM (Million m³)</span>
              </div>
              <div className="text-[7.5px] text-[#537575]">
                {bathymetryData.volumeM3.toLocaleString()} m³ retention
              </div>
            </div>

            <div className="text-right">
              <div className="text-[7.5px] uppercase tracking-wider text-[#537575]">
                Mean / Max Depth:
              </div>
              <div className="text-sm font-bold text-[#082424]">
                {bathymetryData.meanDepthMeters.toFixed(1)}m <span className="text-[#537575] text-[9px]">/ {bathymetryData.maxDepthMeters.toFixed(1)}m</span>
              </div>
              <div className="text-[7.5px] text-[#0D9488] font-bold">
                {bathymetryData.capacityPercentage}% Capacity
              </div>
            </div>
          </div>

          {/* Depth Strata Breakdown Chart */}
          <div className="bg-[#FFF8F2] p-2 border border-[#007979]/20 rounded-xs space-y-1">
            <div className="flex items-center justify-between text-[7.5px] text-[#537575]">
              <span className="font-bold text-[#082424] uppercase flex items-center gap-1">
                <BarChart3 className="w-2.5 h-2.5 text-[#007979]" />
                Depth Strata Volumetric Distribution
              </span>
              <span className="text-[#007979] font-semibold">DEM Integrated</span>
            </div>

            <div className="h-24 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bathymetryData.depthDistribution} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="depthRange" tick={{ fontSize: 7, fill: '#537575', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 7, fill: '#537575', fontFamily: 'monospace' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ fontSize: '8.5px', fontFamily: 'monospace', backgroundColor: '#FFFFFF', borderColor: '#007979', color: '#082424' }} 
                    formatter={(val: number) => [`${val.toFixed(2)} MCM`, 'Volume']}
                  />
                  <Bar dataKey="volumeMCM" radius={[2, 2, 0, 0]}>
                    <Cell fill="#24B1B1" />
                    <Cell fill="#007979" />
                    <Cell fill="#052626" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: BIO-OPTICAL SPECTRAL WATER QUALITY                    */}
      {/* ============================================================ */}
      {activeTab === 'water_quality' && waterQualityData && (
        <div className="space-y-2 text-[8.5px]">
          
          {/* Overall WQI Score Hero Banner */}
          <div className={`p-2 rounded-xs border flex items-center justify-between ${
            waterQualityData.overallWqi >= 75
              ? 'bg-[#0D9488]/10 border-[#0D9488]/40 text-[#0D9488]'
              : waterQualityData.overallWqi >= 50
              ? 'bg-[#D97706]/10 border-[#D97706]/40 text-[#D97706]'
              : 'bg-[#E11D48]/10 border-[#E11D48]/40 text-[#E11D48]'
          }`}>
            <div>
              <div className="text-[7.5px] uppercase tracking-wider text-[#537575]">Overall Water Quality Index (WQI):</div>
              <div className="text-base sm:text-lg font-black flex items-center gap-1.5">
                <span>{waterQualityData.overallWqi} / 100</span>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-xs bg-white border border-current">
                  {waterQualityData.wqiStatus}
                </span>
              </div>
            </div>
            <div className="text-right text-[7.5px] text-[#537575]">
              <div>Sentinel-2 MSI</div>
              <div>Bio-Optical Model</div>
            </div>
          </div>

          {/* 3 Parameter Cards */}
          <div className="space-y-1.5">
            
            {/* 1. Turbidity / TSS */}
            <div className="bg-[#FFF8F2] p-2 border border-[#007979]/20 rounded-xs space-y-1">
              <div className="flex items-center justify-between text-[8px]">
                <span className="font-bold text-[#082424] flex items-center gap-1">
                  <Droplets className="w-2.5 h-2.5 text-[#EAB308]" />
                  1. Turbidity / Suspended Solids (TSS)
                </span>
                <span className="text-[#D97706] font-bold">{waterQualityData.turbidityNtu} NTU</span>
              </div>
              <div className="flex justify-between text-[7px] text-[#537575]">
                <span>NDTI: {waterQualityData.turbidityNdti > 0 ? '+' : ''}{waterQualityData.turbidityNdti}</span>
                <span>TSS: ~{waterQualityData.tssMgL} mg/L</span>
                <span className="text-[#082424] font-semibold">{waterQualityData.turbidityStatus}</span>
              </div>
            </div>

            {/* 2. Chlorophyll-a & Algae Bloom */}
            <div className="bg-[#FFF8F2] p-2 border border-[#007979]/20 rounded-xs space-y-1">
              <div className="flex items-center justify-between text-[8px]">
                <span className="font-bold text-[#082424] flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5 text-[#0D9488]" />
                  2. Chlorophyll-a &amp; Algal Bloom Risk
                </span>
                <span className="text-[#0D9488] font-bold">{waterQualityData.chlorophyllUgL} µg/L</span>
              </div>
              <div className="flex justify-between text-[7px] text-[#537575]">
                <span>NDCI: {waterQualityData.chlorophyllNdci}</span>
                <span>Carlson TSI: {waterQualityData.trophicStateIndex}</span>
                <span className="text-[#0D9488] font-bold">{waterQualityData.algalBloomRisk}</span>
              </div>
            </div>

            {/* 3. CDOM (Colored Dissolved Organic Matter) */}
            <div className="bg-[#FFF8F2] p-2 border border-[#007979]/20 rounded-xs space-y-1">
              <div className="flex items-center justify-between text-[8px]">
                <span className="font-bold text-[#082424] flex items-center gap-1">
                  <Layers className="w-2.5 h-2.5 text-[#D97706]" />
                  3. CDOM Dissolved Organic Carbon
                </span>
                <span className="text-[#D97706] font-bold">a_cdom: {waterQualityData.cdomAbsorption} m⁻¹</span>
              </div>
              <div className="flex justify-between text-[7px] text-[#537575]">
                <span>Absorption (440nm)</span>
                <span className="text-[#082424] font-semibold">{waterQualityData.cdomStatus}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: HYPSOMETRIC AREA-ELEVATION CURVES                     */}
      {/* ============================================================ */}
      {activeTab === 'hypsometry' && bathymetryData && (
        <div className="space-y-2 text-[8.5px]">
          <div className="flex items-center justify-between text-[7.5px] text-[#537575]">
            <span className="font-bold text-[#082424] uppercase flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5 text-[#007979]" />
              Hypsometric Profile: A(h) vs V(h)
            </span>
            <span className="text-[#007979] font-bold">3D Integration</span>
          </div>

          <div className="h-28 w-full bg-[#FFF8F2] p-1 border border-[#007979]/20 rounded-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bathymetryData.hypsometricCurve} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="elevationLevel" tick={{ fontSize: 6.5, fill: '#537575', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 7, fill: '#537575', fontFamily: 'monospace' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ fontSize: '8.5px', fontFamily: 'monospace', backgroundColor: '#FFFFFF', borderColor: '#007979', color: '#082424' }} 
                  formatter={(val: number, name: string) => [
                    name === 'cumulativeVolumeMCM' ? `${val.toFixed(2)} MCM` : `${val.toFixed(2)} km²`,
                    name === 'cumulativeVolumeMCM' ? 'Volume V(h)' : 'Area A(h)'
                  ]}
                />
                <Area type="monotone" dataKey="cumulativeVolumeMCM" stroke="#007979" fill="#007979" fillOpacity={0.25} />
                <Area type="monotone" dataKey="areaKm2" stroke="#24B1B1" fill="#24B1B1" fillOpacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[7px] text-[#537575] leading-tight flex items-center justify-between">
            <span>Deep Teal: Volume $V(h)$</span>
            <span>Aqua: Footprint $A(h)$</span>
          </div>
        </div>
      )}
    </div>
  );
}
