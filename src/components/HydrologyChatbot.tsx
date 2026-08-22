import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  X, 
  Check, 
  Copy, 
  Zap, 
  TrendingDown, 
  TrendingUp, 
  MapPin, 
  Calendar, 
  ArrowUpRight, 
  Brain, 
  Loader2,
  BarChart3
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChatbotLogo } from './ChatbotLogo';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: {
    type: string;
    waterBody: string;
    label: string;
    bbox: [number, number, number, number];
    years: [string, string];
    chartData: Array<{ year: string; area: number; sarArea?: number; label?: string }>;
    trendline?: Array<{ year: string; area: number }>;
    metrics: {
      baselineArea: number;
      targetArea: number;
      netDeltaKm2: number;
      pctChange: number;
      severity: string;
    };
  };
  timestamp: string;
  model?: string;
}

interface HydrologyChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: {
    waterBody: string;
    bbox: [number, number, number, number];
    years: [string, string];
  };
  onApplyConfig: (config: {
    waterBody: string;
    bbox: [number, number, number, number];
    years: [string, string];
    autoRun?: boolean;
  }) => void;
}

const QUICK_PROMPTS = [
  {
    title: 'Pallikaranai 2015 vs 2016',
    prompt: 'I want to see the difference in Pallikaranai marshland between 2015 and 2016. Generate the charts required.',
    badge: 'Historic Flood vs Drought'
  },
  {
    title: 'Chembarambakkam Reservoir',
    prompt: 'Compare Chembarambakkam Lake in 2015 vs 2016 and show water retention changes with charts.',
    badge: 'Monsoon Ingress'
  },
  {
    title: 'Chilika Lake 2019 vs 2024',
    prompt: 'Show water extent difference in Chilika Lake between 2019 and 2024 with trendlines.',
    badge: 'Lagoon Trajectory'
  },
  {
    title: 'Lake Mead Multi-Year Trend',
    prompt: 'Analyze Lake Mead water surface area shrinkage and generate longitudinal trajectory charts.',
    badge: 'Arid Desiccation'
  }
];

export function HydrologyChatbot({ isOpen, onClose, currentConfig, onApplyConfig }: HydrologyChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### 👋 Welcome to AquaSense AI Hydrological Copilot!
I am your **Earth Observation & Remote Sensing Copilot**, powered by **Google Gemini 3.7 Flash**.

You can ask me natural language queries like:
* *"I want to see in this lake diff in 2015 and 2016 generate charts required"*
* *"Compare Chembarambakkam Lake 2015 vs 2016 flood vs drought"*
* *"Analyze Chilika Lake water extent between 2019 and 2024"*

I will parse the target coordinates, evaluate satellite indices (NDWI & SAR), generate interactive charts, and provide instant sync to the main satellite observatory.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'Google Gemini 3.7 Flash Thinking'
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));
      historyPayload.push({ role: 'user', content: query });

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          currentConfig
        })
      });

      if (!res.ok) {
        throw new Error(`Chat API responded with status ${res.status}`);
      }

      const data = await res.json();
      
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.text || 'No analysis generated.',
        action: data.action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: data.model || 'Google Gemini 3.7 Flash'
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Error Processing Query**: ${err.message || 'Unable to connect to AI engine'}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: 'System Error Fallback'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: `### 🔄 Session Cleared
I am ready for your next hydrological query. Enter a lake name or select a quick prompt below to generate comparisons and charts.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: 'Google Gemini 3.7 Flash Thinking'
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed z-50 transition-all duration-300 font-sans ${
        isExpanded 
          ? 'inset-4 md:inset-8 bg-[#FFF0E4]/98 border-2 border-[#007979]/40 rounded-xs shadow-2xl flex flex-col backdrop-blur-xl' 
          : 'bottom-4 right-4 w-full sm:w-[480px] h-[640px] max-h-[88vh] bg-[#FFF0E4]/98 border-2 border-[#007979]/30 rounded-xs shadow-2xl flex flex-col backdrop-blur-xl'
      }`}
    >
      {/* 1. COPILOT MODAL HEADER */}
      <div className="px-3.5 py-2.5 bg-[#007979] text-[#FFF0E4] border-b border-[#007979]/20 flex items-center justify-between font-mono shadow-sm">
        <div className="flex items-center gap-2.5">
          <ChatbotLogo size="md" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide">
                AquaSense AI Copilot
              </span>
              <span className="text-[7.5px] bg-[#052626] border border-[#24B1B1]/40 text-[#24B1B1] px-1 py-0.2 rounded-xs font-bold">
                GEMINI 3.7
              </span>
            </div>
            <span className="text-[7.5px] text-[#FFE0C5]/80">
              Natural Language Earth Observation &amp; Chart Generator
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 text-[#FFF0E4]">
          <button
            onClick={handleClearHistory}
            className="p-1 hover:bg-[#052626] rounded-xs transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-1 hover:bg-[#052626] rounded-xs transition-colors cursor-pointer"
            title={isExpanded ? "Restore Size" : "Expand Fullscreen"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#052626] text-[#FFE0C5] hover:text-[#E11D48] rounded-xs transition-colors cursor-pointer"
            title="Close Copilot"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. CHAT STREAM AREA */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#FFF0E4] select-text font-sans">
        
        {/* Quick Suggestion Pills */}
        <div className="space-y-1.5 font-mono">
          <div className="flex items-center justify-between text-[8px] text-[#537575]">
            <span className="flex items-center gap-1 uppercase font-bold text-[#082424]">
              <Sparkles className="w-3 h-3 text-[#007979]" />
              Quick Hydrological Queries:
            </span>
            <span className="text-[#537575]">Click to execute</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp.prompt)}
                disabled={loading}
                className="text-left p-2 bg-white hover:bg-[#FFE0C5] border border-[#007979]/20 hover:border-[#007979] rounded-xs transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
              >
                <div className="text-[8.5px] font-bold text-[#082424] group-hover:text-[#007979] flex items-center justify-between">
                  <span>{qp.title}</span>
                  <ArrowUpRight className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 text-[#007979]" />
                </div>
                <span className="text-[7px] text-[#537575]">{qp.badge}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Message Thread */}
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
          >
            {/* Sender Badge */}
            <div className="flex items-center gap-1.5 text-[7.5px] font-mono text-[#537575] px-1">
              {msg.role === 'user' ? (
                <span className="font-bold">You • {msg.timestamp}</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <ChatbotLogo size="sm" animated={false} className="w-4 h-4" />
                  <span className="text-[#007979] font-bold">{msg.model || 'AquaSense AI'}</span>
                  <span>• {msg.timestamp}</span>
                </div>
              )}
            </div>

            {/* Message Bubble */}
            <div 
              className={`p-3 rounded-xs max-w-[95%] text-[9.5px] leading-relaxed font-sans transition-all shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-[#007979] text-[#FFF0E4] border border-[#007979]' 
                  : 'bg-white border border-[#007979]/20 text-[#082424] w-full'
              }`}
            >
              {/* Content with Markdown Formatter */}
              <div className="space-y-2 whitespace-pre-wrap text-[9px] leading-relaxed">
                {msg.content.split('\n').map((line, lineIdx) => {
                  if (line.startsWith('### ')) {
                    return <h3 key={lineIdx} className="text-[10.5px] font-bold text-[#007979] font-mono mt-1 border-b border-[#007979]/15 pb-0.5">{line.replace('### ', '')}</h3>;
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <div key={lineIdx} className="font-bold text-[#082424] font-mono text-[9.5px]">{line.replace(/\*\*/g, '')}</div>;
                  }
                  if (line.startsWith('* ')) {
                    return (
                      <div key={lineIdx} className="flex items-start gap-1.5 pl-1.5">
                        <span className="text-[#007979] font-mono">•</span>
                        <span>{line.replace('* ', '')}</span>
                      </div>
                    );
                  }
                  return <p key={lineIdx} className={msg.role === 'user' ? 'text-[#FFF0E4]' : 'text-[#082424]'}>{line}</p>;
                })}
              </div>

              {/* ACTION & INLINE INTERACTIVE CHARTS */}
              {msg.action && (
                <div className="mt-3 pt-2.5 border-t border-[#007979]/15 space-y-2.5 font-mono">
                  
                  {/* Basin & Years Header */}
                  <div className="flex flex-wrap items-center justify-between gap-1 bg-[#FFF8F2] p-2 border border-[#007979]/20 rounded-xs">
                    <div className="flex items-center gap-1.5 text-[8.5px]">
                      <MapPin className="w-3 h-3 text-[#007979]" />
                      <span className="font-bold text-[#082424]">{msg.action.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[8px] text-[#537575]">
                      <Calendar className="w-2.5 h-2.5 text-[#007979]" />
                      <span className="text-[#007979] font-bold">{msg.action.years?.[0] || 'T0'} vs {msg.action.years?.[1] || 'T1'}</span>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[8px]">
                    <div className="bg-[#FFF8F2] p-1.5 border border-[#007979]/15 rounded-xs">
                      <div className="text-[7px] text-[#537575]">T0 BASELINE ({msg.action.years?.[0]})</div>
                      <div className="font-bold text-[#082424] text-[9.5px]">{msg.action.metrics.baselineArea.toFixed(2)} km²</div>
                    </div>
                    <div className="bg-[#FFF8F2] p-1.5 border border-[#007979]/15 rounded-xs">
                      <div className="text-[7px] text-[#537575]">T1 TARGET ({msg.action.years?.[1]})</div>
                      <div className="font-bold text-[#082424] text-[9.5px]">{msg.action.metrics.targetArea.toFixed(2)} km²</div>
                    </div>
                    <div className={`p-1.5 border rounded-xs ${
                      msg.action.metrics.netDeltaKm2 < 0 
                        ? 'bg-[#E11D48]/10 border-[#E11D48]/30 text-[#E11D48]' 
                        : 'bg-[#0D9488]/10 border-[#0D9488]/30 text-[#0D9488]'
                    }`}>
                      <div className="text-[7px] text-[#537575]">NET DELTA:</div>
                      <div className="font-bold text-[9.5px]">
                        {msg.action.metrics.netDeltaKm2 > 0 ? '+' : ''}{msg.action.metrics.netDeltaKm2.toFixed(2)} km²
                      </div>
                    </div>
                    <div className={`p-1.5 border rounded-xs ${
                      msg.action.metrics.pctChange < 0 
                        ? 'bg-[#E11D48]/10 border-[#E11D48]/30 text-[#E11D48]' 
                        : 'bg-[#0D9488]/10 border-[#0D9488]/30 text-[#0D9488]'
                    }`}>
                      <div className="text-[7px] text-[#537575]">RELATIVE:</div>
                      <div className="font-bold text-[9.5px]">
                        {msg.action.metrics.pctChange > 0 ? '+' : ''}{msg.action.metrics.pctChange.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* CHART 1: INLINE WATER EXTENT COMPARISON BAR CHART */}
                  <div className="bg-[#FFF8F2] p-2 border border-[#007979]/15 rounded-xs space-y-1">
                    <div className="flex items-center justify-between text-[7.5px] text-[#537575]">
                      <span className="font-bold uppercase text-[#082424] flex items-center gap-1">
                        <BarChart3 className="w-2.5 h-2.5 text-[#007979]" />
                        Surface Water Extent Comparison
                      </span>
                      <span className="text-[#007979] font-semibold">10m NDWI Ground Truth</span>
                    </div>
                    
                    <div className="h-28 w-full pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={msg.action.chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <XAxis dataKey="year" tick={{ fontSize: 8, fill: '#537575', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 8, fill: '#537575', fontFamily: 'monospace' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip 
                            contentStyle={{ fontSize: '9px', fontFamily: 'monospace', backgroundColor: '#FFFFFF', borderColor: '#007979', color: '#082424' }} 
                            formatter={(value: number) => [`${value.toFixed(2)} km²`, 'Water Extent']}
                          />
                          <Bar dataKey="area" radius={[2, 2, 0, 0]}>
                            {msg.action.chartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#007979' : '#24B1B1'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* CHART 2: LONGITUDINAL TRAJECTORY TRENDLINE */}
                  {msg.action.trendline && msg.action.trendline.length > 0 && (
                    <div className="bg-[#FFF8F2] p-2 border border-[#007979]/15 rounded-xs space-y-1">
                      <div className="flex items-center justify-between text-[7.5px] text-[#537575]">
                        <span className="font-bold uppercase text-[#082424] flex items-center gap-1">
                          <TrendingDown className="w-2.5 h-2.5 text-[#007979]" />
                          Multi-Year Longitudinal Trajectory
                        </span>
                        <span className="text-[#007979] font-semibold">Annual Trendline</span>
                      </div>
                      
                      <div className="h-24 w-full pt-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={msg.action.trendline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <XAxis dataKey="year" tick={{ fontSize: 8, fill: '#537575', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 8, fill: '#537575', fontFamily: 'monospace' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip 
                              contentStyle={{ fontSize: '9px', fontFamily: 'monospace', backgroundColor: '#FFFFFF', borderColor: '#007979', color: '#082424' }} 
                              formatter={(value: number) => [`${value.toFixed(2)} km²`, 'Water Extent']}
                            />
                            <Line type="monotone" dataKey="area" stroke="#007979" strokeWidth={2} dot={{ r: 2.5, fill: '#24B1B1' }} activeDot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* ACTION BUTTON: APPLY TO MAIN OBSERVATORY */}
                  <button
                    onClick={() => {
                      if (!msg.action) return;
                      const safeYears: [string, string] = (msg.action.years && Array.isArray(msg.action.years) && msg.action.years.length >= 2)
                        ? msg.action.years
                        : ['2019', '2025'];
                      const safeBbox: [number, number, number, number] = (msg.action.bbox && Array.isArray(msg.action.bbox) && msg.action.bbox.length === 4)
                        ? msg.action.bbox
                        : [80.20, 12.91, 80.23, 12.95];
                      onApplyConfig({
                        waterBody: msg.action.waterBody || 'PALLIKARANAI_MARSH_CHENNAI',
                        bbox: safeBbox,
                        years: safeYears,
                        autoRun: true
                      });
                    }}
                    className="w-full bg-[#007979] hover:bg-[#24B1B1] text-[#FFF0E4] hover:text-[#052626] border border-[#24B1B1]/50 py-2 px-3 rounded-xs font-mono text-[9px] font-bold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current text-[#24B1B1] group-hover:text-[#052626]" />
                    <span>⚡ Apply to Main Map &amp; Run Satellite STAC Ingestion</span>
                  </button>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#007979]/10 text-[7px] text-[#537575]">
                <button
                  onClick={() => handleCopyMessage(msg.id, msg.content)}
                  className="hover:text-[#007979] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedId === msg.id ? <Check className="w-2.5 h-2.5 text-[#0D9488]" /> : <Copy className="w-2.5 h-2.5" />}
                  <span>{copiedId === msg.id ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-2.5 bg-white border border-[#007979]/20 rounded-xs text-[#007979] text-[8.5px] font-mono shadow-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Gemini 3.7 Flash parsing basin coordinates &amp; computing chart data...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. INPUT BAR */}
      <div className="p-2.5 bg-white border-t border-[#007979]/20 flex items-center gap-2 font-mono">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Ask e.g. 'I want to see difference in Pallikaranai between 2015 and 2016 generate charts'..."
          disabled={loading}
          className="flex-1 bg-[#FFF8F2] border border-[#007979]/30 rounded-xs px-3 py-2 text-[9px] text-[#082424] placeholder-[#537575] focus:outline-none focus:border-[#007979] transition-all font-sans"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!input.trim() || loading}
          className="bg-[#007979] hover:bg-[#24B1B1] text-[#FFF0E4] hover:text-[#052626] px-3.5 py-2 rounded-xs flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 border border-[#24B1B1]/40"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
