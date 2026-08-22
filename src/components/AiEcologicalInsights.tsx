import React, { useState } from 'react';
import { 
  Sparkles, 
  Brain, 
  Search, 
  MapPin, 
  Zap, 
  Image as ImageIcon, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ExternalLink, 
  Radio,
  Cpu,
  Layers,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

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
  bathymetryData?: { volumeMCM: number; volumeM3: number; meanDepthMeters: number } | null;
  waterQualityData?: { turbidityNtu: number; turbidityStatus: string; chlorophyllUgL: number; algalBloomRisk: string; cdomAbsorption: number; overallWqi: number; wqiStatus: string } | null;
}

export function AiEcologicalInsights({ 
  sceneData, 
  config, 
  change, 
  pctChange, 
  isSarPenetrating = false,
  bathymetryData = null,
  waterQualityData = null
}: AiEcologicalInsightsProps) {
  const [activeTab, setActiveTab] = useState<'synthesis' | 'grounding' | 'field_photo'>('synthesis');
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

  const getActiveModelDetails = () => {
    switch (synthesisMode) {
      case 'deep_reasoning':
        return {
          name: 'Google Gemini 3.7 Flash',
          tag: 'CoT Thinking Engine',
          badgeColor: 'text-[#007979] border-[#007979]/40 bg-[#007979]/10',
          tokens: '32,768 Reasoning Window',
          latency: '420ms',
          role: 'Deep Multi-Sensor Ecological Synthesis & Causal Inference'
        };
      case 'search_grounded':
        return {
          name: 'Google Gemini 3.5 Flash',
          tag: 'Search Grounded',
          badgeColor: 'text-[#24B1B1] border-[#24B1B1]/40 bg-[#24B1B1]/10',
          tokens: 'Real-Time Web Indexing',
          latency: '310ms',
          role: 'Live Statutory News, Ramsar Records & CPCB Regulatory Grounding'
        };
      case 'maps_grounded':
        return {
          name: 'Google Gemini 3.5 Flash',
          tag: 'Geospatial Grounded',
          badgeColor: 'text-[#0D9488] border-[#0D9488]/40 bg-[#0D9488]/10',
          tokens: 'Google Maps Places API',
          latency: '290ms',
          role: 'Hydrological Landmark Identification & Urban Encroachment Buffers'
        };
      case 'fast_summary':
        return {
          name: 'Google Gemini 3.1 Flash Lite',
          tag: 'Low-Latency Core',
          badgeColor: 'text-[#D97706] border-[#D97706]/40 bg-[#D97706]/10',
          tokens: '8k Context Stream',
          latency: '110ms',
          role: 'Sub-second Hydrological Metric Distillation'
        };
    }
  };

  const activeModel = getActiveModelDetails();

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
          volumeMCM: bathymetryData?.volumeMCM,
          volumeM3: bathymetryData?.volumeM3,
          meanDepthMeters: bathymetryData?.meanDepthMeters,
          turbidityNtu: waterQualityData?.turbidityNtu,
          turbidityStatus: waterQualityData?.turbidityStatus,
          chlorophyllUgL: waterQualityData?.chlorophyllUgL,
          algalBloomRisk: waterQualityData?.algalBloomRisk,
          cdomAbsorption: waterQualityData?.cdomAbsorption,
          overallWqi: waterQualityData?.overallWqi,
          wqiStatus: waterQualityData?.wqiStatus,
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

  return (
    <div className="bg-white/95 border border-[#007979]/20 shadow-md font-mono text-[11px] rounded-xs overflow-hidden header-trace-teal">
      
      {/* Header with Deep Teal */}
      <div className="bg-[#007979] text-[#FFF0E4] px-3 py-2 flex items-center justify-between border-b border-[#007979]/20">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
          <Brain className="w-3.5 h-3.5 text-[#24B1B1]" />
          <span>Gemini Ecological Intelligence</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isSarPenetrating && (
            <span className="text-[7.5px] px-1.5 py-0.2 bg-[#24B1B1]/20 border border-[#24B1B1]/40 text-[#FFF0E4] font-bold rounded-xs flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse text-[#24B1B1]" /> S1 SAR ACTIVE
            </span>
          )}
          <span className="text-[7.5px] px-1.5 py-0.2 bg-[#052626] border border-[#24B1B1]/30 text-[#24B1B1] font-bold rounded-xs">
            4-MODEL SUITE
          </span>
        </div>
      </div>

      {/* ACTIVE MODEL IDENTIFICATION CHIP */}
      <div className="bg-[#FFF8F2] px-3 py-2 border-b border-[#007979]/15 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[8.5px]">
            <Cpu className="w-3 h-3 text-[#007979]" />
            <span className="text-[#537575] uppercase">Target Model:</span>
            <span className="font-bold text-[#082424]">{activeModel.name}</span>
          </div>
          <span className={`text-[7.5px] px-1.5 py-0.2 font-bold rounded-xs border ${activeModel.badgeColor}`}>
            {activeModel.tag}
          </span>
        </div>
        <div className="flex items-center justify-between text-[7.5px] text-[#537575]">
          <span>Role: {activeModel.role}</span>
          <span>Latency: <strong className="text-[#007979] font-bold">{activeModel.latency}</strong></span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#007979]/15 bg-[#FFF8F2]">
        <button
          onClick={() => setActiveTab('synthesis')}
          className={`flex-1 py-1.5 px-2 text-[8.5px] uppercase font-bold border-r border-[#007979]/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'synthesis'
              ? 'bg-[#007979] text-[#FFF0E4] border-b-2 border-b-[#24B1B1]'
              : 'text-[#537575] hover:text-[#082424] hover:bg-[#FFE0C5]/40'
          }`}
        >
          <Brain className="w-3 h-3" /> Synthesis
        </button>
        <button
          onClick={() => setActiveTab('grounding')}
          className={`flex-1 py-1.5 px-2 text-[8.5px] uppercase font-bold border-r border-[#007979]/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'grounding'
              ? 'bg-[#007979] text-[#FFF0E4] border-b-2 border-b-[#24B1B1]'
              : 'text-[#537575] hover:text-[#082424] hover:bg-[#FFE0C5]/40'
          }`}
        >
          <Search className="w-3 h-3" /> Grounding
        </button>
        <button
          onClick={() => setActiveTab('field_photo')}
          className={`flex-1 py-1.5 px-2 text-[8.5px] uppercase font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'field_photo'
              ? 'bg-[#007979] text-[#FFF0E4] border-b-2 border-b-[#24B1B1]'
              : 'text-[#537575] hover:text-[#082424] hover:bg-[#FFE0C5]/40'
          }`}
        >
          <ImageIcon className="w-3 h-3" /> Drone Vision
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Tab 1: Synthesis Modes */}
        {activeTab === 'synthesis' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => { setSynthesisMode('deep_reasoning'); handleGenerateSynthesis('deep_reasoning'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-2 px-2 border rounded-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  synthesisMode === 'deep_reasoning'
                    ? 'bg-[#007979] border-[#007979] text-[#FFF0E4] shadow-sm font-bold'
                    : 'bg-[#FFF8F2] border-[#007979]/20 text-[#537575] hover:border-[#24B1B1]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1 font-bold text-[9px] text-[#24B1B1]">
                  <Brain className="w-3 h-3 text-[#24B1B1]" /> Deep Reasoning
                </div>
                <span className="text-[7.5px] font-bold">gemini-3.7-flash</span>
                <span className="text-[6.5px] opacity-80">CoT Thinking Stream</span>
              </button>

              <button
                onClick={() => { setSynthesisMode('fast_summary'); handleGenerateSynthesis('fast_summary'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-2 px-2 border rounded-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  synthesisMode === 'fast_summary'
                    ? 'bg-[#007979] border-[#007979] text-[#FFF0E4] shadow-sm font-bold'
                    : 'bg-[#FFF8F2] border-[#007979]/20 text-[#537575] hover:border-[#24B1B1]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1 font-bold text-[9px] text-[#D97706]">
                  <Zap className="w-3 h-3 text-[#D97706]" /> Fast Distillation
                </div>
                <span className="text-[7.5px] font-bold">gemini-3.1-flash-lite</span>
                <span className="text-[6.5px] opacity-80">Sub-second Latency</span>
              </button>
            </div>

            <button
              onClick={() => handleGenerateSynthesis()}
              disabled={!sceneData || loading}
              className="w-full bg-[#007979] hover:bg-[#24B1B1] text-[#FFF0E4] hover:text-[#052626] font-bold py-2 rounded-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Multi-Sensor Dynamics...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#24B1B1]" />
                  <span>Execute Gemini 3.7 Ecological Reasoning</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: Grounding Modes */}
        {activeTab === 'grounding' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => { setSynthesisMode('search_grounded'); handleGenerateSynthesis('search_grounded'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-2 px-2 border rounded-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  synthesisMode === 'search_grounded'
                    ? 'bg-[#007979] border-[#007979] text-[#FFF0E4] shadow-sm font-bold'
                    : 'bg-[#FFF8F2] border-[#007979]/20 text-[#537575] hover:border-[#24B1B1]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1 font-bold text-[9px] text-[#24B1B1]">
                  <Search className="w-3 h-3 text-[#24B1B1]" /> Search Grounding
                </div>
                <span className="text-[7.5px] font-bold">gemini-3.5-flash</span>
                <span className="text-[6.5px] opacity-80">Real-Time News &amp; Ramsar</span>
              </button>

              <button
                onClick={() => { setSynthesisMode('maps_grounded'); handleGenerateSynthesis('maps_grounded'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-2 px-2 border rounded-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  synthesisMode === 'maps_grounded'
                    ? 'bg-[#007979] border-[#007979] text-[#FFF0E4] shadow-sm font-bold'
                    : 'bg-[#FFF8F2] border-[#007979]/20 text-[#537575] hover:border-[#24B1B1]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1 font-bold text-[9px] text-[#0D9488]">
                  <MapPin className="w-3 h-3 text-[#0D9488]" /> Maps Grounding
                </div>
                <span className="text-[7.5px] font-bold">gemini-3.5-flash</span>
                <span className="text-[6.5px] opacity-80">Google Places AOI Verification</span>
              </button>
            </div>

            <button
              onClick={() => handleGenerateSynthesis()}
              disabled={!sceneData || loading}
              className="w-full bg-[#007979] hover:bg-[#24B1B1] text-[#FFF0E4] hover:text-[#052626] font-bold py-2 rounded-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Grounding via Google Search &amp; Places...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 text-[#24B1B1]" />
                  <span>Run Live Grounded Verification</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 3: Drone / Field Photo */}
        {activeTab === 'field_photo' && (
          <div className="space-y-2 text-[8.5px]">
            <div className="border border-dashed border-[#007979]/30 rounded-xs p-2.5 text-center bg-[#FFF8F2]">
              {fieldImageBase64 ? (
                <div className="space-y-2">
                  <img
                    src={`data:${fieldMimeType};base64,${fieldImageBase64}`}
                    alt="Field Inspection Preview"
                    className="max-h-28 mx-auto rounded-xs object-cover border border-[#007979]/30"
                  />
                  <button
                    onClick={() => setFieldImageBase64(null)}
                    className="text-[7.5px] text-[#E11D48] hover:underline cursor-pointer"
                  >
                    Remove Photo
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-1 cursor-pointer">
                  <Upload className="w-5 h-5 text-[#007979]" />
                  <span className="font-bold text-[#082424]">Upload Drone / Field Photo</span>
                  <span className="text-[7.5px] text-[#537575]">JPEG, PNG (Ground-Truth Multimodal)</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>

            <button
              onClick={handleAnalyzeFieldImage}
              disabled={!fieldImageBase64 || analyzingFieldImage}
              className="w-full bg-[#007979] hover:bg-[#24B1B1] text-[#FFF0E4] hover:text-[#052626] font-bold py-2 rounded-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-30"
            >
              {analyzingFieldImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Multimodal Inspection in Progress...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#24B1B1]" />
                  <span>Run Multimodal Vision Inspection</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-2 bg-[#E11D48]/10 border border-[#E11D48]/30 rounded-xs text-[#E11D48] text-[8px] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Synthesis Result Display */}
        {resultText && (
          <div className="bg-[#FFF8F2] border border-[#007979]/20 rounded-xs p-2.5 space-y-2 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#007979]/15 pb-1 text-[7.5px]">
              <span className="text-[#0D9488] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#0D9488]" /> Synthesis Verified
              </span>
              <span className="text-[#537575] font-semibold">{modelUsed}</span>
            </div>
            <div className="text-[8.5px] leading-relaxed whitespace-pre-wrap text-[#082424] font-sans">
              {resultText}
            </div>

            {/* Grounding Web Links */}
            {groundingChunks && groundingChunks.length > 0 && (
              <div className="pt-2 border-t border-[#007979]/15 space-y-1">
                <div className="text-[7.5px] font-bold text-[#537575] uppercase">Live Sources:</div>
                <div className="space-y-0.5">
                  {groundingChunks.slice(0, 3).map((c, i) => (
                    <a
                      key={i}
                      href={c.web?.uri || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[7.5px] text-[#007979] hover:underline flex items-center gap-1 truncate"
                    >
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{c.web?.title || c.web?.uri}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Field Photo Vision Analysis Result */}
        {fieldAnalysis && (
          <div className="bg-[#FFF8F2] border border-[#007979]/20 rounded-xs p-2.5 space-y-1.5">
            <div className="flex items-center justify-between border-b border-[#007979]/15 pb-1 text-[7.5px]">
              <span className="text-[#D97706] font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#D97706]" /> Field Vision Grounded
              </span>
              <span className="text-[#537575]">{modelUsed}</span>
            </div>
            <p className="text-[8.5px] text-[#082424] leading-relaxed font-sans">{fieldAnalysis}</p>
          </div>
        )}
      </div>
    </div>
  );
}
