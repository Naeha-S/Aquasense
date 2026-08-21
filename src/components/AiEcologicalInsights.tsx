import React, { useState } from 'react';
import { Sparkles, Brain, Search, MapPin, Zap, Image as ImageIcon, Upload, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';

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
    <div className="bg-white border border-[#141414] mt-4 font-mono text-[11px]">
      <div className="bg-[#141414] text-[#E4E3E0] px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          Gemini Ecological Intelligence
        </div>
        <div className="text-[9px] opacity-70">Model Grounding & Reasoning</div>
      </div>

      <div className="flex border-b border-[#141414] bg-[#f0eee9]">
        <button
          onClick={() => setActiveTab('synthesis')}
          className={`flex-1 py-1.5 px-2 text-[10px] uppercase font-bold border-r border-[#141414] transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'synthesis' ? 'bg-white text-[#141414]' : 'text-black/60 hover:text-black'
          }`}
        >
          <Brain className="w-3 h-3" /> Synthesis
        </button>
        <button
          onClick={() => setActiveTab('grounding')}
          className={`flex-1 py-1.5 px-2 text-[10px] uppercase font-bold border-r border-[#141414] transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'grounding' ? 'bg-white text-[#141414]' : 'text-black/60 hover:text-black'
          }`}
        >
          <Search className="w-3 h-3" /> Live Grounding
        </button>
        <button
          onClick={() => setActiveTab('field_photo')}
          className={`flex-1 py-1.5 px-2 text-[10px] uppercase font-bold transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'field_photo' ? 'bg-white text-[#141414]' : 'text-black/60 hover:text-black'
          }`}
        >
          <ImageIcon className="w-3 h-3" /> Field Inspection
        </button>
      </div>

      <div className="p-3 space-y-3">
        {activeTab === 'synthesis' && (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              <button
                onClick={() => { setSynthesisMode('deep_reasoning'); handleGenerateSynthesis('deep_reasoning'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-1.5 px-2 text-[9px] border border-[#141414] flex flex-col items-center gap-0.5 transition-all ${
                  synthesisMode === 'deep_reasoning' ? 'bg-[#141414] text-[#E4E3E0]' : 'bg-[#E4E3E0] hover:bg-black/10'
                } disabled:opacity-40`}
              >
                <div className="flex items-center gap-1 font-bold">
                  <Brain className="w-3 h-3 text-purple-400" /> Deep Thinking
                </div>
                <span className="text-[8px] opacity-75">gemini-3.7-flash</span>
              </button>

              <button
                onClick={() => { setSynthesisMode('fast_summary'); handleGenerateSynthesis('fast_summary'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-1.5 px-2 text-[9px] border border-[#141414] flex flex-col items-center gap-0.5 transition-all ${
                  synthesisMode === 'fast_summary' ? 'bg-[#141414] text-[#E4E3E0]' : 'bg-[#E4E3E0] hover:bg-black/10'
                } disabled:opacity-40`}
              >
                <div className="flex items-center gap-1 font-bold">
                  <Zap className="w-3 h-3 text-amber-400" /> Low Latency
                </div>
                <span className="text-[8px] opacity-75">gemini-3.1-flash-lite</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'grounding' && (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              <button
                onClick={() => { setSynthesisMode('search_grounded'); handleGenerateSynthesis('search_grounded'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-1.5 px-2 text-[9px] border border-[#141414] flex flex-col items-center gap-0.5 transition-all ${
                  synthesisMode === 'search_grounded' ? 'bg-[#141414] text-[#E4E3E0]' : 'bg-[#E4E3E0] hover:bg-black/10'
                } disabled:opacity-40`}
              >
                <div className="flex items-center gap-1 font-bold">
                  <Search className="w-3 h-3 text-blue-400" /> Search Grounding
                </div>
                <span className="text-[8px] opacity-75">gemini-3.5-flash</span>
              </button>

              <button
                onClick={() => { setSynthesisMode('maps_grounded'); handleGenerateSynthesis('maps_grounded'); }}
                disabled={!sceneData || loading}
                className={`flex-1 py-1.5 px-2 text-[9px] border border-[#141414] flex flex-col items-center gap-0.5 transition-all ${
                  synthesisMode === 'maps_grounded' ? 'bg-[#141414] text-[#E4E3E0]' : 'bg-[#E4E3E0] hover:bg-black/10'
                } disabled:opacity-40`}
              >
                <div className="flex items-center gap-1 font-bold">
                  <MapPin className="w-3 h-3 text-green-400" /> Maps Grounding
                </div>
                <span className="text-[8px] opacity-75">gemini-3.5-flash</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'field_photo' && (
          <div className="space-y-3">
            <div className="border border-dashed border-[#141414]/40 p-3 text-center bg-[#f7f6f3]">
              {fieldImageBase64 ? (
                <div className="space-y-2">
                  <div className="relative inline-block">
                    <img
                      src={`data:${fieldMimeType};base64,${fieldImageBase64}`}
                      alt="Field Upload"
                      className="max-h-32 mx-auto border border-[#141414] object-contain"
                    />
                    <button
                      onClick={() => { setFieldImageBase64(null); setFieldAnalysis(null); }}
                      className="absolute -top-1.5 -right-1.5 bg-[#141414] text-white p-0.5 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={handleAnalyzeFieldImage}
                    disabled={analyzingFieldImage}
                    className="w-full bg-[#141414] text-white py-1.5 text-[10px] uppercase font-bold flex items-center justify-center gap-1"
                  >
                    {analyzingFieldImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-yellow-400" />}
                    {analyzingFieldImage ? 'Analyzing Image...' : 'Analyze Ground Truth (gemini-3.7-flash)'}
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload className="w-5 h-5 mx-auto mb-1 opacity-50" />
                  <div className="text-[10px] font-bold">Upload Drone / Field Photo</div>
                  <div className="text-[8px] opacity-60 mt-0.5">Supports JPG/PNG ground-truth captures</div>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>

            {fieldAnalysis && (
              <div className="bg-[#f7f6f3] border border-[#141414] p-2 text-[9px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
                <div className="font-bold text-[10px] border-b border-[#141414]/20 pb-1 mb-1 flex items-center justify-between">
                  <span>Field Photo Assessment</span>
                  <span className="text-[8px] opacity-60">gemini-3.7-flash</span>
                </div>
                {fieldAnalysis}
              </div>
            )}
          </div>
        )}

        {/* Synthesis & Grounding Output Box */}
        {(activeTab === 'synthesis' || activeTab === 'grounding') && (
          <div>
            {loading && (
              <div className="bg-[#f7f6f3] border border-[#141414] p-4 text-center space-y-2">
                <Loader2 className="w-5 h-5 mx-auto animate-spin text-[#141414]" />
                <div className="text-[10px] font-bold uppercase">Synthesizing Environmental Intelligence...</div>
                <div className="text-[8px] opacity-60">Executing Gemini model reasoning with live grounding</div>
              </div>
            )}

            {!loading && resultText && (
              <div className="bg-[#f7f6f3] border border-[#141414] p-2.5 text-[9.5px] leading-relaxed space-y-2 max-h-56 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#141414]/20 pb-1 text-[8.5px]">
                  <span className="font-bold uppercase text-[#141414]">Synthesis Report</span>
                  <span className="bg-[#141414] text-white px-1.5 py-0.5 text-[7.5px] uppercase">{modelUsed}</span>
                </div>
                <div className="whitespace-pre-line text-[#141414]/90 font-sans text-[10px]">
                  {resultText}
                </div>
                {groundingChunks && groundingChunks.length > 0 && (
                  <div className="pt-2 border-t border-[#141414]/15">
                    <div className="font-bold text-[8px] uppercase opacity-70 mb-1">Sources & Grounding:</div>
                    <ul className="space-y-0.5 text-[8px] text-blue-700">
                      {groundingChunks.slice(0, 3).map((chunk, idx) => (
                        <li key={idx} className="truncate">
                          {chunk.web?.uri ? (
                            <a href={chunk.web.uri} target="_blank" rel="noreferrer" className="underline hover:text-blue-900">
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
              <div className="text-[9px] text-center opacity-50 py-2">
                {sceneData ? 'Select a reasoning mode above to generate insights.' : 'Run the pipeline first to unlock AI synthesis.'}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-500 text-red-800 p-2 text-[9px] flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold uppercase">AI Processing Notice</div>
              <div className="opacity-90">{error}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
