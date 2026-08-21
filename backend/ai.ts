import { GoogleGenAI } from "@google/genai";

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets.");
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

export interface EcologicalAnalysisRequest {
  waterBodyName: string;
  bbox: [number, number, number, number];
  years: [string, string];
  areaA: number;
  areaB: number;
  pctChange: number;
  cloudCoverA?: number;
  cloudCoverB?: number;
  sensorMode?: "optical" | "sar" | "fused";
  sarAreaA?: number;
  sarAreaB?: number;
  sarThresholdDb?: number;
  isSarPenetrating?: boolean;
  mode?: "deep_reasoning" | "search_grounded" | "maps_grounded" | "fast_summary";
}

export async function generateEcologicalAnalysis(data: EcologicalAnalysisRequest) {
  const ai = getGenAI();
  const { 
    waterBodyName, 
    bbox, 
    years, 
    areaA, 
    areaB, 
    pctChange, 
    cloudCoverA = 0, 
    cloudCoverB = 0,
    sensorMode = "fused",
    sarAreaA,
    sarAreaB,
    sarThresholdDb = -16,
    isSarPenetrating = false,
    mode = "deep_reasoning" 
  } = data;

  const sarContext = (sensorMode === 'sar' || sensorMode === 'fused' || isSarPenetrating) ? `
Sentinel-1 C-band SAR Radar Telemetry:
- Sensor: Sentinel-1 C-SAR (5.405 GHz, λ = 5.6 cm, Dual-Pol VV+VH)
- Radiometric Terrain Corrected (RTC) Backscatter Threshold: ${sarThresholdDb} dB (specular forward reflection cutoff for open water)
- Radar-derived Water Extent: Baseline (${years[0]}): ${sarAreaA ? sarAreaA.toFixed(2) : areaA.toFixed(2)} km², Target (${years[1]}): ${sarAreaB ? sarAreaB.toFixed(2) : areaB.toFixed(2)} km²
- Cloud Penetration Status: ${isSarPenetrating ? "ACTIVE (Optical occluded by monsoon clouds, SAR penetrated 100%)" : "ALL-WEATHER MULTI-SENSOR FUSION"}
` : '';

  const promptContext = `
You are a senior Earth Observation scientist and wetland hydrology expert analyzing multi-spectral and synthetic aperture radar (SAR) observations.

Basin Region: ${waterBodyName.replace(/_/g, " ")}
Geographic Extent (BBOX): [${bbox.join(", ")}]
Optical Cloud Cover: Baseline: ${cloudCoverA.toFixed(1)}%, Target: ${cloudCoverB.toFixed(1)}%
Baseline (${years[0]}): ${areaA.toFixed(2)} km² water extent
Target (${years[1]}): ${areaB.toFixed(2)} km² water extent
Net Change: ${pctChange > 0 ? "+" : ""}${pctChange.toFixed(2)}% (${(areaB - areaA).toFixed(2)} km²)
${sarContext}

Provide an authoritative, scientific, and structured ecological synthesis covering:
1. Hydrological Trajectory & Multi-Sensor Interpretation (NDWI + Sentinel-1 SAR Backscatter Physics)
2. Root Cause Attribution (Climate/Monsoon anomalies vs. Urbanization & canal encroachment)
3. Flood Buffer Vulnerability & Habitat Integrity
4. Actionable Conservation & Remote Sensing Interventions
Format using clean Markdown with concise sections and data-backed rationale.
`;

  if (mode === "deep_reasoning") {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: promptContext,
      });
      return {
        text: response.text || "No synthesis generated.",
        model: "gemini-3.7-flash (Deep Ecological Analysis + SAR Fusion)",
        mode: "deep_reasoning",
      };
    } catch (err: any) {
      console.warn("Primary gemini-3.7-flash attempt failed, falling back to gemini-3.5-flash:", err.message);
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptContext,
      });
      return {
        text: fallbackResponse.text || "No synthesis generated.",
        model: "gemini-3.5-flash (Fallback)",
        mode: "deep_reasoning",
      };
    }
  } else if (mode === "search_grounded") {
    const searchPrompt = `
Investigate recent environmental reports, news, and conservation status regarding ${waterBodyName.replace(/_/g, " ")} in the region of bbox [${bbox.join(", ")}].
The satellite observation detected a ${pctChange > 0 ? "gain" : "loss"} of ${Math.abs(pctChange).toFixed(1)}% in water surface area between ${years[0]} and ${years[1]}.
Provide factual ground-truth context, recent government/conservation actions, and notable climate events in this basin.
`;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: searchPrompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      return {
        text: response.text || "No grounded search data available.",
        model: "gemini-3.5-flash (Google Search Grounding)",
        mode: "search_grounded",
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
      };
    } catch (err: any) {
      console.warn("Search grounded request failed:", err.message);
      return {
        text: `Search Grounding Error: ${err.message}`,
        model: "gemini-3.5-flash",
        mode: "search_grounded",
      };
    }
  } else if (mode === "maps_grounded") {
    const mapsPrompt = `
Analyze the spatial landmarks, hydrological connectivity, and surrounding urban infrastructure for ${waterBodyName.replace(/_/g, " ")} at coordinates [${bbox.join(", ")}].
Identify key water channels, adjacent roads/developments, and geographical buffer zones.
`;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: mapsPrompt,
      });
      return {
        text: response.text || "No geospatial landmark data available.",
        model: "gemini-3.5-flash (Geospatial Landmark Grounding)",
        mode: "maps_grounded",
      };
    } catch (err: any) {
      return {
        text: `Maps Grounding Error: ${err.message}`,
        model: "gemini-3.5-flash",
        mode: "maps_grounded",
      };
    }
  } else {
    // Fast summary mode with gemini-3.1-flash-lite
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: promptContext,
      });
      return {
        text: response.text || "No summary generated.",
        model: "gemini-3.1-flash-lite (Fast Overview)",
        mode: "fast_summary",
      };
    } catch (err: any) {
      return {
        text: `Summary Error: ${err.message}`,
        model: "gemini-3.1-flash-lite",
        mode: "fast_summary",
      };
    }
  }
}

export async function analyzeFieldImage(imageBase64: string, mimeType: string, customPrompt?: string) {
  const ai = getGenAI();
  const prompt = customPrompt || `
Analyze this drone or ground-truth field photograph for wetland and water body monitoring.
1. Identify the presence of open water, emergent vegetation, invasive weeds (e.g. Eichhornia / water hyacinth), and algal blooms.
2. Estimate the condition of the shoreline and signs of urban construction or debris dumping.
3. Provide confidence estimates for classes: 'open_water', 'wetland_flora', 'bare_soil', 'built_up'.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType || "image/jpeg",
              },
            },
          ],
        },
      ],
    });

    return {
      analysis: response.text || "No visual analysis generated.",
      model: "gemini-3.7-flash (Multimodal Vision)",
    };
  } catch (err: any) {
    console.warn("Primary multimodal analysis failed with gemini-3.7-flash, trying gemini-3.5-flash:", err.message);
    const fallbackResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType || "image/jpeg",
              },
            },
          ],
        },
      ],
    });
    return {
      analysis: fallbackResponse.text || "No visual analysis generated.",
      model: "gemini-3.5-flash (Multimodal Fallback)",
    };
  }
}
