import React, { useState } from 'react';
import { Sparkles, Brain, Search, MapPin, Zap, Image as ImageIcon, Upload, Loader2, CheckCircle, AlertCircle, X, ExternalLink } from 'lucide-react';

interface AiEcologicalInsightsProps {
  sceneData: {
    yearA: { id: string; date: string; cloudCover: number; trueColor: string; ndwi: string; area: number };
    yearB: { id: string; date: string; cloudCover: number; trueColor: string; ndwi: string; area: number };
  } | null;
  config: {
    waterBody: string;
    bbox: [number, number, number, number];
    years: [string, string];
    ndwiThreshold: number;
  };
  change: number;
  pctChange: number;
}

export function AiEcologicalInsights({ sceneData, config, change, pctChange }: AiEcologicalInsightsProps) {
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
          prompt: `Analyze this field or drone verification image for the ${config.waterBody.replace(/_/g, ' ')} wetland basin. Assess water extent, vegetation condition, eutrophication, and human encroachment. Provide estimated few-shot class confidence scores ('water', 'wetland', 'built_up').`,
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
    <div className="bg-[#071326] border border-[#1D3D73] shadow-xl font-mono text-[11px] rounded-sm overflow-hidden">
      {/* HUD Header */}
      <div className="bg-[#0C1E3D] text-[#F0FDFA] px-3.5 py-2.5 flex items-center justify-between border-b border-[#1D3D73]">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-[#FBBF24] animate-pulse" />
          <span className="text-[#38BDF8]">Gemini Ecological Intelligence</span>
        </div>
        <div className="text-[8.5px] px-2 py-0.5 bg-[#22D3EE]/15 border border-[#22D3EE]/30 text-[#22D3EE] font-bold rounded-xs">
          4-MODE AI SUITE
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#1D3D73] bg-[#0A1832]">
        <button
          onClick={() => setActiveTab('synthesis')}
          className={`flex-1 py-2 px-2.5 text-[9.5px] uppercase font-bold border-r border-[#1D3D73] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'synthesis'
              ? 'bg-[#0C1E3D] text-[#22D3EE] border-b-2 border-b-[#22D3EE]'
              : 'text-[#738CAD] hover:text-[#F0FDFA] hover:bg-[#0E2247]'
          }`}
        >
          <Brain className="w-3.5 h-3.5" /> Synthesis
        </button>
        <button
          onClick={() => setActiveTab('grounding')}
          className={`flex-1 py-2 px-2.5 text-[9.5px] uppercase font-bold border-r border-[#1D3D73] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'grounding'
              ? 'bg-[#0C1E3D] text-[#06D6A0] border-b-2 border-b-[#06D6A0]'
              : 'text-[#738CAD] hover:text-[#F0FDFA] hover:bg-[#0E2247]'
          }`}
        >
          <Search className="w-3.5 h-3.5" /> Grounding
        </button>
        <button
          onClick={() => setActiveTab('field_photo')}
          className={`flex-1 py-2 px-2.5 text-[9.5px] uppercase font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'field_photo'
              ? 'bg-[#0C1E3D] text-[#FBBF24] border-b-2 border-b-[#FBBF24]'
              : 'text-[#738CAD] hover:text-[#F0FDFA] hover:bg-[#0E2247]'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" /> Drone Vision
        </button>
      </div>

      <div className="p-3 space-y-3">
        {activeTab === 'synthesis' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => { setSynthesisMode('deep_reasoning'); handleGenerateSynthesis('deep_reasoning'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-2 px-2.5 border rounded-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  synthesisMode === 'deep_reasoning'
                    ? 'bg-[#0C1E3D] border-[#22D3EE] text-[#F0FDFA] shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                    : 'bg-[#0A1832] border-[#1D3D73] text-[#CADDAE] hover:border-[#22D3EE]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1.5 font-bold text-[10px] text-[#22D3EE]">
                  <Brain className="w-3.5 h-3.5 text-[#22D3EE]" /> Deep Reasoning
                </div>
                <span className="text-[7.5px] text-[#738CAD]">gemini-3.7-flash</span>
              </button>

              <button
                onClick={() => { setSynthesisMode('fast_summary'); handleGenerateSynthesis('fast_summary'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-2 px-2.5 border rounded-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  synthesisMode === 'fast_summary'
                    ? 'bg-[#0C1E3D] border-[#FBBF24] text-[#F0FDFA] shadow-[0_0_10px_rgba(251,191,36,0.25)]'
                    : 'bg-[#0A1832] border-[#1D3D73] text-[#CADDAE] hover:border-[#FBBF24]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1.5 font-bold text-[10px] text-[#FBBF24]">
                  <Zap className="w-3.5 h-3.5 text-[#FBBF24]" /> Low Latency
                </div>
                <span className="text-[7.5px] text-[#738CAD]">gemini-3.1-flash-lite</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'grounding' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => { setSynthesisMode('search_grounded'); handleGenerateSynthesis('search_grounded'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-2 px-2.5 border rounded-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  synthesisMode === 'search_grounded'
                    ? 'bg-[#0C1E3D] border-[#06D6A0] text-[#F0FDFA] shadow-[0_0_10px_rgba(6,214,160,0.25)]'
                    : 'bg-[#0A1832] border-[#1D3D73] text-[#CADDAE] hover:border-[#06D6A0]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1.5 font-bold text-[10px] text-[#06D6A0]">
                  <Search className="w-3.5 h-3.5 text-[#06D6A0]" /> Google Search
                </div>
                <span className="text-[7.5px] text-[#738CAD]">gemini-3.5-flash</span>
              </button>

              <button
                onClick={() => { setSynthesisMode('maps_grounded'); handleGenerateSynthesis('maps_grounded'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-2 px-2.5 border rounded-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  synthesisMode === 'maps_grounded'
                    ? 'bg-[#0C1E3D] border-[#38BDF8] text-[#F0FDFA] shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                    : 'bg-[#0A1832] border-[#1D3D73] text-[#CADDAE] hover:border-[#38BDF8]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1.5 font-bold text-[10px] text-[#38BDF8]">
                  <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" /> Google Maps
                </div>
                <span className="text-[7.5px] text-[#738CAD]">gemini-3.5-flash</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'field_photo' && (
          <div className="space-y-3">
            <div className="border border-dashed border-[#22D3EE]/40 p-4 text-center bg-[#0C1E3D]/60 rounded-sm">
              {fieldImageBase64 ? (
                <div className="space-y-2.5">
                  <div className="relative inline-block">
                    <img
                      src={`data:${fieldMimeType};base64,${fieldImageBase64}`}
                      alt="Field Upload"
                      className="max-h-36 mx-auto border border-[#22D3EE] object-contain rounded-xs shadow-lg"
                    />
                    <button
                      onClick={() => { setFieldImageBase64(null); setFieldAnalysis(null); }}
                      className="absolute -top-2 -right-2 bg-[#F43F5E] text-white p-1 rounded-full shadow hover:scale-110 transition-transform cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={handleAnalyzeFieldImage}
                    disabled={analyzingFieldImage}
                    className="w-full bg-[#22D3EE] text-[#030712] py-2 text-[10px] uppercase font-bold flex items-center justify-center gap-1.5 rounded-xs hover:bg-[#38BDF8] transition-colors cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.4)]"
                  >
                    {analyzingFieldImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {analyzingFieldImage ? 'Synthesizing Multimodal Vision...' : 'Analyze Ground Truth (gemini-3.7-flash)'}
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block group">
                  <Upload className="w-6 h-6 mx-auto mb-1.5 text-[#22D3EE] opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                  <div className="text-[10.5px] font-bold text-[#F0FDFA]">Upload Drone / Field Validation Photo</div>
                  <div className="text-[8px] text-[#738CAD] mt-0.5">Supports JPG/PNG captures for eutrophication & few-shot ML assessment</div>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>

            {fieldAnalysis && (
              <div className="bg-[#0C1E3D] border border-[#1D3D73] p-3 text-[9.5px] leading-relaxed max-h-52 overflow-y-auto whitespace-pre-line rounded-sm">
                <div className="font-bold text-[10px] text-[#22D3EE] border-b border-[#1D3D73] pb-1 mb-1.5 flex items-center justify-between">
                  <span>Field Photo Assessment</span>
                  <span className="text-[7.5px] bg-[#22D3EE]/20 px-1.5 py-0.2 text-[#22D3EE] rounded-xs">gemini-3.7-flash</span>
                </div>
                <div className="text-[#F0FDFA] font-sans text-[10.5px] leading-relaxed">
                  {fieldAnalysis}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Synthesis & Grounding Output Box */}
        {(activeTab === 'synthesis' || activeTab === 'grounding') && (
          <div>
            {loading && (
              <div className="bg-[#0C1E3D] border border-[#22D3EE]/40 p-4 text-center space-y-2 rounded-sm">
                <Loader2 className="w-6 h-6 mx-auto animate-spin text-[#22D3EE]" />
                <div className="text-[11px] font-bold uppercase text-[#F0FDFA]">Synthesizing Ecological Intelligence...</div>
                <div className="text-[8.5px] text-[#738CAD]">Executing Gemini reasoning forward pass with live tool grounding</div>
              </div>
            )}

            {!loading && resultText && (
              <div className="bg-[#0C1E3D] border border-[#1D3D73] p-3 text-[9.5px] leading-relaxed space-y-2.5 max-h-60 overflow-y-auto rounded-sm">
                <div className="flex items-center justify-between border-b border-[#1D3D73] pb-1.5 text-[8.5px]">
                  <span className="font-bold uppercase text-[#22D3EE] tracking-wide flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[#06D6A0]" /> Synthesis Report
                  </span>
                  <span className="bg-[#22D3EE]/20 border border-[#22D3EE]/40 text-[#22D3EE] px-2 py-0.5 text-[7.5px] uppercase font-bold rounded-xs">
                    {modelUsed}
                  </span>
                </div>
                <div className="whitespace-pre-line text-[#F0FDFA] font-sans text-[10.5px] leading-relaxed">
                  {resultText}
                </div>
                {groundingChunks && groundingChunks.length > 0 && (
                  <div className="pt-2 border-t border-[#1D3D73]">
                    <div className="font-bold text-[8.5px] uppercase text-[#38BDF8] mb-1">Grounding Sources & Citations:</div>
                    <ul className="space-y-1 text-[8.5px] text-[#06D6A0]">
                      {groundingChunks.slice(0, 3).map((chunk, idx) => (
                        <li key={idx} className="truncate flex items-center gap-1">
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                          {chunk.web?.uri ? (
                            <a href={chunk.web.uri} target="_blank" rel="noreferrer" className="underline hover:text-[#22D3EE]">
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
              <div className="text-[9.5px] text-center text-[#738CAD] py-3 bg-[#0C1E3D]/40 border border-[#1D3D73]/60 rounded-xs">
                {sceneData ? 'Select a reasoning mode above to execute Gemini synthesis.' : 'Execute the STAC pipeline to unlock AI ecological synthesis.'}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-[#F43F5E]/15 border border-[#F43F5E]/50 text-[#F43F5E] p-2.5 text-[9.5px] flex items-start gap-2 rounded-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#F43F5E]" />
            <div>
              <div className="font-bold uppercase text-[10px]">AI Processing Notice</div>
              <div className="opacity-90">{error}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
