import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Search, MapPin, Zap, Image as ImageIcon, Upload, Loader2, CheckCircle2, AlertCircle, X, ExternalLink, Radio, Cpu, RefreshCw, Network } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

// 12-D spectral dimension order (matches ml/encoders/spectral_12d.ts).
const SPECTRAL12_DIMS = [
  'B02', 'B03', 'B04', 'B08', 'NDWI', 'MNDWI', 'NDTI', 'NDCI', 'VV', 'VH', 'ΔDEM', 'WQI',
];
const NORM_RANGES: Record<string, [number, number]> = {
  B02: [0, 0.15], B03: [0, 0.2], B04: [0, 0.25], B08: [0, 0.3],
  NDWI: [-1, 1], MNDWI: [-1, 1], NDTI: [-1, 1], NDCI: [-1, 1],
  VV: [-30, 0], VH: [-30, 0], 'ΔDEM': [0, 40], WQI: [0, 100],
};
const localClamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const CLASS_COLORS: Record<string, string> = {
  water: '#2DD4BF',
  wetland: '#10B981',
  built_up: '#F59E0B',
};
const RAG_CATEGORY_COLORS: Record<string, string> = {
  ramsar: '#2DD4BF',
  cpcb: '#38BDF8',
  who: '#F59E0B',
  bio_optics: '#A78BFA',
  climate: '#FB7185',
  regional: '#10B981',
};

interface AiEcologicalInsightsProps {
  sceneData: {
    yearA: { id: string; date: string; cloudCover: number; trueColor: string; ndwi: string; area: number; sarArea?: number };
    yearB: { id: string; date: string; cloudCover: number; trueColor: string; ndwi: string; area: number; sarArea?: number };
  } | null;
  config: {
    waterBody: string;
    bbox: [number, number, number, number];
    years: [string, string];
    ndwiThreshold: number;
    sensorMode?: 'optical' | 'sar' | 'fused';
    sarThresholdDb?: number;
  };
  change: number;
  pctChange: number;
  isSarPenetrating?: boolean;
}

export function AiEcologicalInsights({ sceneData, config, change, pctChange, isSarPenetrating = false }: AiEcologicalInsightsProps) {
  const [activeTab, setActiveTab] = useState<'synthesis' | 'grounding' | 'field_photo' | 'local_rag'>('synthesis');
  const [synthesisMode, setSynthesisMode] = useState<'deep_reasoning' | 'search_grounded' | 'maps_grounded' | 'fast_summary'>('deep_reasoning');
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Field photo inspection state
  const [fieldImageBase64, setFieldImageBase64] = useState<string | null>(null);
  const [fieldMimeType, setFieldMimeType] = useState<string>('image/jpeg');
  const [fieldAnalysis, setFieldAnalysis] = useState<string | null>(null);
  const [analyzingFieldImage, setAnalyzingFieldImage] = useState(false);

  // Local RAG & 12-D Classifier engine state
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localPerYear, setLocalPerYear] = useState<any[] | null>(null);
  const [rag, setRag] = useState<{ retrievedChunks: any[]; synthesis: string; bboxAreaKm2?: number } | null>(null);

  const handleGenerateSynthesis = async (mode = synthesisMode) => {
    if (!sceneData) return;
    setLoading(true);
    setError(null);
    setResultText(null);
    setGroundingChunks([]);

    try {
      const res = await fetch('/api/ai/ecological-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waterBodyName: config.waterBody,
          bbox: config.bbox,
          years: config.years,
          areaA: sceneData.yearA.area,
          areaB: sceneData.yearB.area,
          pctChange,
          cloudCoverA: sceneData.yearA.cloudCover,
          cloudCoverB: sceneData.yearB.cloudCover,
          sensorMode: config.sensorMode || 'fused',
          sarAreaA: sceneData.yearA.sarArea,
          sarAreaB: sceneData.yearB.sarArea,
          sarThresholdDb: config.sarThresholdDb || -16,
          isSarPenetrating,
          mode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Synthesis generation failed');
      }

      setResultText(data.text);
      setModelUsed(data.model);
      if (data.groundingChunks) {
        setGroundingChunks(data.groundingChunks);
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with Gemini intelligence backend');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFieldMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      setFieldImageBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeFieldImage = async () => {
    if (!fieldImageBase64) return;
    setAnalyzingFieldImage(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/image-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: fieldImageBase64,
          mimeType: fieldMimeType,
          prompt: `Analyze this ground-truth/drone photo for ${config.waterBody.replace(/_/g, ' ')}. Evaluate wetland flora health, water turbidity, eutrophication, and human encroachment. Relate findings to Sentinel-1 C-band SAR radar backscatter and Sentinel-2 NDWI observations.`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Image analysis failed');
      }

      setFieldAnalysis(data.analysis);
      setModelUsed(data.model);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze uploaded photo');
    } finally {
      setAnalyzingFieldImage(false);
    }
  };

  // ---- Local RAG & 12-D Classifier engine ----
  const runLocalEngine = async () => {
    if (!config.bbox) return;
    setLocalLoading(true);
    setLocalError(null);
    try {
      const embRes = await fetch('/api/ai/spectral-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bbox: config.bbox,
          years: config.years,
          waterBody: config.waterBody,
        }),
      });
      const emb = await embRes.json();
      if (!embRes.ok) throw new Error(emb.error || 'Spectral embedding failed');
      setLocalPerYear(emb.perYear);

      const ragRes = await fetch('/api/ai/local-rag-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bbox: config.bbox,
          years: config.years,
          waterBody: config.waterBody,
        }),
      });
      const ragData = await ragRes.json();
      if (!ragRes.ok) throw new Error(ragData.error || 'Local RAG analysis failed');
      setRag({
        retrievedChunks: ragData.retrievedChunks || [],
        synthesis: ragData.synthesis || '',
        bboxAreaKm2: ragData.bboxAreaKm2,
      });
    } catch (err: any) {
      setLocalError(err.message || 'Local hydrological engine error');
    } finally {
      setLocalLoading(false);
    }
  };

  // Auto-run once when the Local RAG tab is first opened.
  useEffect(() => {
    if (activeTab === 'local_rag' && !localPerYear && !localLoading) {
      runLocalEngine();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="bg-[#0E1726]/90 border border-[#1E293B] shadow-lg font-mono text-[11px] rounded-xs overflow-hidden">
      {/* Header with Subtle Amber Trace */}
      <div className="bg-[#131F37] text-[#F1F5F9] px-3 py-2 flex items-center justify-between border-b border-[#1E293B] border-t-2 border-t-[#F59E0B]">
        <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-[10.5px]">
          <Brain className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>Gemini Ecological Intelligence</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isSarPenetrating && (
            <span className="text-[7px] px-1.5 py-0.2 bg-[#2DD4BF]/20 border border-[#2DD4BF]/40 text-[#2DD4BF] font-semibold rounded-xs flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse" /> S1 SAR RADAR
            </span>
          )}
          <span className="text-[7.5px] px-1.5 py-0.2 bg-[#1E293B] border border-[#334155] text-[#94A3B8] font-medium rounded-xs">
            4-MODE AI
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#1E293B] bg-[#0A0F1D]">
        <button
          onClick={() => setActiveTab('synthesis')}
          className={`flex-1 py-1.5 px-2 text-[9px] uppercase font-semibold border-r border-[#1E293B] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'synthesis'
              ? 'bg-[#16223D] text-[#2DD4BF] border-b-2 border-b-[#2DD4BF]'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#131F37]'
          }`}
        >
          <Brain className="w-3 h-3" /> Synthesis
        </button>
        <button
          onClick={() => setActiveTab('grounding')}
          className={`flex-1 py-1.5 px-2 text-[9px] uppercase font-semibold border-r border-[#1E293B] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'grounding'
              ? 'bg-[#16223D] text-[#38BDF8] border-b-2 border-b-[#38BDF8]'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#131F37]'
          }`}
        >
          <Search className="w-3 h-3" /> Grounding
        </button>
        <button
          onClick={() => setActiveTab('field_photo')}
          className={`flex-1 py-1.5 px-2 text-[9px] uppercase font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'field_photo'
              ? 'bg-[#16223D] text-[#F59E0B] border-b-2 border-b-[#F59E0B]'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#131F37]'
          }`}
        >
          <ImageIcon className="w-3 h-3" /> Drone Vision
        </button>
        <button
          onClick={() => setActiveTab('local_rag')}
          className={`flex-1 py-1.5 px-2 text-[9px] uppercase font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'local_rag'
              ? 'bg-[#16223D] text-[#2DD4BF] border-b-2 border-b-[#2DD4BF]'
              : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#131F37]'
          }`}
        >
          <Network className="w-3 h-3" /> Local RAG
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        {activeTab === 'synthesis' && (
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <button
                onClick={() => { setSynthesisMode('deep_reasoning'); handleGenerateSynthesis('deep_reasoning'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-1.5 px-2 border rounded-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  synthesisMode === 'deep_reasoning'
                    ? 'bg-[#16223D] border-[#2DD4BF] text-[#F1F5F9]'
                    : 'bg-[#0A0F1D] border-[#1E293B] text-[#94A3B8] hover:border-[#334155]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1 font-semibold text-[9.5px] text-[#2DD4BF]">
                  <Brain className="w-3 h-3 text-[#2DD4BF]" /> Deep Reasoning
                </div>
                <span className="text-[7.5px] text-[#64748B]">gemini-3.7-flash</span>
              </button>

              <button
                onClick={() => { setSynthesisMode('fast_summary'); handleGenerateSynthesis('fast_summary'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-1.5 px-2 border rounded-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  synthesisMode === 'fast_summary'
                    ? 'bg-[#16223D] border-[#F59E0B] text-[#F1F5F9]'
                    : 'bg-[#0A0F1D] border-[#1E293B] text-[#94A3B8] hover:border-[#334155]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1 font-semibold text-[9.5px] text-[#F59E0B]">
                  <Zap className="w-3 h-3 text-[#F59E0B]" /> Low Latency
                </div>
                <span className="text-[7.5px] text-[#64748B]">gemini-3.1-flash-lite</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'grounding' && (
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <button
                onClick={() => { setSynthesisMode('search_grounded'); handleGenerateSynthesis('search_grounded'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-1.5 px-2 border rounded-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  synthesisMode === 'search_grounded'
                    ? 'bg-[#16223D] border-[#38BDF8] text-[#F1F5F9]'
                    : 'bg-[#0A0F1D] border-[#1E293B] text-[#94A3B8] hover:border-[#334155]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1 font-semibold text-[9.5px] text-[#38BDF8]">
                  <Search className="w-3 h-3 text-[#38BDF8]" /> Google Search
                </div>
                <span className="text-[7.5px] text-[#64748B]">gemini-3.5-flash</span>
              </button>

              <button
                onClick={() => { setSynthesisMode('maps_grounded'); handleGenerateSynthesis('maps_grounded'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-1.5 px-2 border rounded-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  synthesisMode === 'maps_grounded'
                    ? 'bg-[#16223D] border-[#2DD4BF] text-[#F1F5F9]'
                    : 'bg-[#0A0F1D] border-[#1E293B] text-[#94A3B8] hover:border-[#334155]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1 font-semibold text-[9.5px] text-[#2DD4BF]">
                  <MapPin className="w-3 h-3 text-[#2DD4BF]" /> Google Maps
                </div>
                <span className="text-[7.5px] text-[#64748B]">gemini-3.5-flash</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'field_photo' && (
          <div className="space-y-2.5">
            <div className="border border-dashed border-[#334155] p-3 text-center bg-[#0A0F1D] rounded-xs">
              {fieldImageBase64 ? (
                <div className="space-y-2">
                  <div className="relative inline-block">
                    <img
                      src={`data:${fieldMimeType};base64,${fieldImageBase64}`}
                      alt="Field Upload"
                      className="max-h-32 mx-auto border border-[#334155] object-contain rounded-xs shadow-md"
                    />
                    <button
                      onClick={() => { setFieldImageBase64(null); setFieldAnalysis(null); }}
                      className="absolute -top-1.5 -right-1.5 bg-[#FB7185] text-white p-0.5 rounded-full shadow hover:scale-110 transition-transform cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={handleAnalyzeFieldImage}
                    disabled={analyzingFieldImage}
                    className="w-full bg-[#16223D] border border-[#2DD4BF] text-[#2DD4BF] py-1.5 text-[9.5px] uppercase font-semibold flex items-center justify-center gap-1.5 rounded-xs hover:bg-[#2DD4BF] hover:text-[#042F2E] transition-colors cursor-pointer"
                  >
                    {analyzingFieldImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-[#F59E0B]" />}
                    {analyzingFieldImage ? 'Synthesizing Vision Feed...' : 'Analyze Ground Truth (gemini-3.7-flash)'}
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block group">
                  <Upload className="w-5 h-5 mx-auto mb-1 text-[#94A3B8] group-hover:text-[#2DD4BF] transition-colors" />
                  <div className="text-[10px] font-semibold text-[#F1F5F9]">Upload Drone / Field Photo</div>
                  <div className="text-[7.5px] text-[#64748B] mt-0.5">Supports JPG/PNG captures for eutrophication & few-shot ML assessment</div>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>

            {fieldAnalysis && (
              <div className="bg-[#0A0F1D] border border-[#1E293B] p-2.5 text-[9px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line rounded-xs">
                <div className="font-semibold text-[9.5px] text-[#2DD4BF] border-b border-[#1E293B] pb-1 mb-1 flex items-center justify-between">
                  <span>Field Photo Assessment</span>
                  <span className="text-[7.5px] bg-[#1E293B] px-1.5 py-0.2 text-[#94A3B8] rounded-xs">gemini-3.7-flash</span>
                </div>
                <div className="text-[#CBD5E1] font-sans text-[10px] leading-relaxed">
                  {fieldAnalysis}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'local_rag' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[8px] text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-[#2DD4BF]" /> Local Engine
                <span className="text-[#2DD4BF] font-semibold">12D · Few-Shot · RAG</span>
              </div>
              <button
                onClick={runLocalEngine}
                disabled={localLoading}
                className="flex items-center gap-1 text-[8px] uppercase font-semibold px-2 py-1 border border-[#2DD4BF]/40 text-[#2DD4BF] hover:bg-[#2DD4BF] hover:text-[#042F2E] rounded-xs transition-colors cursor-pointer disabled:opacity-40"
              >
                {localLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                {localLoading ? 'Running…' : 'Re-run'}
              </button>
            </div>

            {localLoading && (
              <div className="bg-[#0A0F1D] border border-[#334155] p-3 text-center space-y-1.5 rounded-xs">
                <Loader2 className="w-5 h-5 mx-auto animate-spin text-[#2DD4BF]" />
                <div className="text-[10px] font-semibold uppercase text-[#F1F5F9]">Running Local Hydrological Engine…</div>
                <div className="text-[8px] text-[#64748B]">12-D spectral extraction + few-shot classification + RAG synthesis (no cloud)</div>
              </div>
            )}

            {!localLoading && localPerYear && (() => {
              const latest = localPerYear[localPerYear.length - 1];
              const radarData = SPECTRAL12_DIMS.map((d, i) => {
                const raw = latest.feature12D[i];
                const [lo, hi] = NORM_RANGES[d];
                return { dimension: d, raw, value: localClamp(((raw - lo) / (hi - lo)) * 100, 0, 100) };
              });
              const cls = latest.classification.classes;
              return (
                <>
                  <div className="bg-[#0A0F1D] border border-[#1E293B] p-2 rounded-xs">
                    <div className="text-[8px] uppercase text-[#94A3B8] mb-1 flex items-center justify-between">
                      <span>12-D Spectral Radar — {latest.year}</span>
                      <span className="text-[#2DD4BF]">ΔDEM / WQI / SAR σ⁰</span>
                    </div>
                    <ResponsiveContainer width="100%" height={210}>
                      <RadarChart data={radarData} outerRadius="72%">
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 8, fill: '#94A3B8', fontFamily: 'monospace' }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="value" stroke="#2DD4BF" fill="#2DD4BF" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-[7.5px] font-mono text-[#CBD5E1] mt-1">
                      {radarData.map((r) => (
                        <div key={r.dimension} className="flex justify-between">
                          <span className="text-[#64748B]">{r.dimension}</span>
                          <span>{r.raw.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0A0F1D] border border-[#1E293B] p-2 rounded-xs space-y-1">
                    <div className="text-[8px] uppercase text-[#94A3B8] mb-0.5">Few-Shot Classification (Logistic Regression)</div>
                    {['water', 'wetland', 'built_up'].map((c) => {
                      const frac = (cls[c]?.fraction ?? 0) * 100;
                      const km2 = cls[c]?.km2 ?? 0;
                      const color = CLASS_COLORS[c] || '#94A3B8';
                      return (
                        <div key={c}>
                          <div className="flex justify-between text-[8px] mb-0.5">
                            <span className="capitalize" style={{ color }}>{c}</span>
                            <span className="text-[#CBD5E1]">{frac.toFixed(1)}% · {km2.toFixed(2)} km²</span>
                          </div>
                          <div className="w-full bg-[#131F37] h-1.5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${frac}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="text-[7.5px] text-[#64748B] pt-0.5">
                      Dominant: <span className="text-[#F1F5F9] capitalize">{latest.classification.dominant}</span>
                      {typeof rag?.bboxAreaKm2 === 'number' && <> · AOI {rag.bboxAreaKm2.toFixed(2)} km²</>}
                    </div>
                  </div>

                  {rag?.retrievedChunks && rag.retrievedChunks.length > 0 && (
                    <div className="bg-[#0A0F1D] border border-[#1E293B] p-2 rounded-xs space-y-1">
                      <div className="text-[8px] uppercase text-[#94A3B8] mb-0.5 flex items-center gap-1">
                        <Network className="w-3 h-3 text-[#2DD4BF]" /> RAG Retrieved Knowledge
                      </div>
                      {rag.retrievedChunks.slice(0, 4).map((chunk: any, i: number) => (
                        <div key={chunk.id || i} className="border border-[#1E293B] rounded-xs p-1.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <span
                              className="text-[7px] px-1.5 py-0.2 rounded-xs font-semibold"
                              style={{ color: RAG_CATEGORY_COLORS[chunk.category] || '#94A3B8', border: `1px solid ${RAG_CATEGORY_COLORS[chunk.category] || '#334155'}55` }}
                            >
                              {chunk.source}
                            </span>
                            <span className="text-[7px] text-[#64748B]">rel {chunk.score?.toFixed?.(2) ?? chunk.score}</span>
                          </div>
                          <div className="text-[8px] text-[#CBD5E1] leading-tight">{chunk.text}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {rag?.synthesis && (
                    <div className="bg-[#0A0F1D] border border-[#1E293B] p-2.5 text-[9px] leading-relaxed max-h-64 overflow-y-auto whitespace-pre-line rounded-xs">
                      <div className="font-semibold text-[9.5px] text-[#2DD4BF] border-b border-[#1E293B] pb-1 mb-1 flex items-center justify-between">
                        <span>Local Ecological Assessment</span>
                        <span className="text-[7.5px] bg-[#16223D] px-1.5 py-0.2 text-[#94A3B8] rounded-xs">spectral_12d · on-device</span>
                      </div>
                      <div className="text-[#CBD5E1] font-sans text-[10px] leading-relaxed">{rag.synthesis}</div>
                    </div>
                  )}
                </>
              );
            })()}

            {!localLoading && !localPerYear && !localError && (
              <div className="text-[9px] text-center text-[#64748B] py-2.5 bg-[#0A0F1D] border border-[#1E293B] rounded-xs">
                {config.bbox ? 'Open the Local RAG engine to run 12-D classification.' : 'Set an AOI to unlock the local engine.'}
              </div>
            )}
          </div>
        )}

        {/* Synthesis & Grounding Output Box */}
        {(activeTab === 'synthesis' || activeTab === 'grounding') && (
          <div>
            {loading && (
              <div className="bg-[#0A0F1D] border border-[#334155] p-3 text-center space-y-1.5 rounded-xs">
                <Loader2 className="w-5 h-5 mx-auto animate-spin text-[#2DD4BF]" />
                <div className="text-[10px] font-semibold uppercase text-[#F1F5F9]">Synthesizing Ecological Intelligence...</div>
                <div className="text-[8px] text-[#64748B]">Executing Gemini model reasoning over optical & SAR radar streams</div>
              </div>
            )}

            {!loading && resultText && (
              <div className="bg-[#0A0F1D] border border-[#1E293B] p-2.5 text-[9px] leading-relaxed space-y-2 max-h-56 overflow-y-auto rounded-xs">
                <div className="flex items-center justify-between border-b border-[#1E293B] pb-1 text-[8px]">
                  <span className="font-semibold uppercase text-[#2DD4BF] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Synthesis Report
                  </span>
                  <span className="bg-[#16223D] border border-[#334155] text-[#94A3B8] px-1.5 py-0.2 text-[7.5px] uppercase font-medium rounded-xs">
                    {modelUsed}
                  </span>
                </div>
                <div className="whitespace-pre-line text-[#CBD5E1] font-sans text-[10px] leading-relaxed">
                  {resultText}
                </div>
                {groundingChunks && groundingChunks.length > 0 && (
                  <div className="pt-2 border-t border-[#1E293B]">
                    <div className="font-semibold text-[8px] uppercase text-[#38BDF8] mb-1">Sources & Grounding:</div>
                    <ul className="space-y-0.5 text-[8px] text-[#2DD4BF]">
                      {groundingChunks.slice(0, 3).map((chunk, idx) => (
                        <li key={idx} className="truncate flex items-center gap-1">
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 text-[#94A3B8]" />
                          {chunk.web?.uri ? (
                            <a href={chunk.web.uri} target="_blank" rel="noreferrer" className="underline hover:text-[#38BDF8]">
                              {chunk.web.title || chunk.web.uri}
                            </a>
                          ) : (
                            chunk.maps?.title || 'Map Landmark Reference'
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!loading && !resultText && (
              <div className="text-[9px] text-center text-[#64748B] py-2.5 bg-[#0A0F1D] border border-[#1E293B] rounded-xs">
                {sceneData ? 'Select a reasoning mode above to execute Gemini synthesis.' : 'Execute the STAC pipeline to unlock AI ecological synthesis.'}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-[#FB7185]/10 border border-[#FB7185]/40 text-[#FB7185] p-2 text-[9px] flex items-start gap-1.5 rounded-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#FB7185]" />
            <div>
              <div className="font-semibold uppercase text-[9.5px]">AI Processing Notice</div>
              <div className="opacity-90">{error}</div>
            </div>
          </div>
        )}

        {localError && (
          <div className="bg-[#FB7185]/10 border border-[#FB7185]/40 text-[#FB7185] p-2 text-[9px] flex items-start gap-1.5 rounded-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#FB7185]" />
            <div>
              <div className="font-semibold uppercase text-[9.5px]">Local Engine Notice</div>
              <div className="opacity-90">{localError}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
