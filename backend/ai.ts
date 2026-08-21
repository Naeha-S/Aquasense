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
  mode?: "deep_reasoning" | "search_grounded" | "maps_grounded" | "fast_summary";
}

export async function generateEcologicalAnalysis(data: EcologicalAnalysisRequest) {
  const ai = getGenAI();
  const { waterBodyName, bbox, years, areaA, areaB, pctChange, mode = "deep_reasoning" } = data;

  const promptContext = `
You are a senior Earth Observation scientist and wetland hydrology expert analyzing satellite-derived hydrological observations.

Region: ${waterBodyName.replace(/_/g, " ")}
Bounding Box: [${bbox.join(", ")}]
Baseline (${years[0]}): ${areaA.toFixed(2)} km² water extent
Target (${years[1]}): ${areaB.toFixed(2)} km² water extent
Change: ${pctChange > 0 ? "+" : ""}${pctChange.toFixed(2)}% (${(areaB - areaA).toFixed(2)} km²)

Provide an authoritative, clear, and structured synthesis covering:
1. Hydrological Trajectory & Ecological Significance
2. Driving Factors (urbanization, precipitation anomalies, wetland conversion)
3. Ecosystem Services & Flood/Drought Vulnerability
4. Recommended Conservation & Remote Sensing Interventions
Format using clean Markdown with concise sections.
`;

  if (mode === "deep_reasoning") {
    // Advanced reasoning with gemini-3.7-flash
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: promptContext,
      });
      return {
        text: response.text || "No synthesis generated.",
        model: "gemini-3.7-flash (Deep Ecological Analysis)",
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
    // Search Grounding with gemini-3.5-flash for recent factual news & reports
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
      console.warn("Search grounding failed, falling back to gemini-3.7-flash without tools:", err.message);
      const fallback = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: `${searchPrompt}\n(Note: Provide best available knowledge on this region and water body).`,
      });
      return {
        text: fallback.text || "No grounded search data available.",
        model: "gemini-3.7-flash (Knowledge Base)",
        mode: "search_grounded",
        groundingChunks: [],
      };
    }
  } else if (mode === "maps_grounded") {
    // Maps Grounding with gemini-3.5-flash for geographic orientation & landmarks
    const mapsPrompt = `
Identify the key geographic landmarks, protected zones, inlets/outlets, and urban centers surrounding ${waterBodyName.replace(/_/g, " ")} around coordinates ${bbox[1]}, ${bbox[0]} to ${bbox[3]}, ${bbox[2]}.
Provide geographical insights on surrounding human developments and natural sanctuaries.
`;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: mapsPrompt,
        config: {
          tools: [{ googleMaps: {} }],
        },
      });
      return {
        text: response.text || "No map grounding available.",
        model: "gemini-3.5-flash (Google Maps Grounding)",
        mode: "maps_grounded",
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
      };
    } catch (err: any) {
      console.warn("Maps grounding failed, falling back to gemini-3.7-flash:", err.message);
      const fallback = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: mapsPrompt,
      });
      return {
        text: fallback.text || "No map grounding available.",
        model: "gemini-3.7-flash (Geographic Analysis)",
        mode: "maps_grounded",
        groundingChunks: [],
      };
    }
  } else {
    // Low-latency mode with gemini-3.1-flash-lite
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `${promptContext}\nKeep the response concise (max 3-4 bullet points).`,
      });
      return {
        text: response.text || "No summary generated.",
        model: "gemini-3.1-flash-lite (Low-Latency Flash)",
        mode: "fast_summary",
      };
    } catch (err: any) {
      const fallback = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: `${promptContext}\nKeep the response concise (max 3-4 bullet points).`,
      });
      return {
        text: fallback.text || "No summary generated.",
        model: "gemini-3.7-flash (Fast Summary)",
        mode: "fast_summary",
      };
    }
  }
}

export async function analyzeFieldImage(imageBase64: string, mimeType: string, promptText?: string) {
  const ai = getGenAI();
  const prompt = promptText || `
You are an expert in wetland ecology, satellite validation, and hydrological ground-truthing.
Analyze this field/aerial/satellite photo of a water body or wetland zone:
1. Identify surface water presence, water clarity, algae/hyacinth cover, or sedimentation.
2. Characterize surrounding vegetation (marshland, reeds, mangroves) vs built-up infrastructure.
3. Identify evidence of encroachment, pollution, or seasonal drying.
4. Provide a Few-Shot land cover classification score breakdown estimate ('water', 'wetland', 'built_up').
Format with concise Markdown.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: imageBase64,
          },
        },
        prompt,
      ],
    });

    return {
      analysis: response.text || "No image analysis generated.",
      model: "gemini-3.7-flash (Multimodal Understanding)",
    };
  } catch (err: any) {
    console.warn("gemini-3.7-flash image analysis failed, attempting gemini-3.5-flash fallback:", err.message);
    const fallbackResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: imageBase64,
          },
        },
        prompt,
      ],
    });

    return {
      analysis: fallbackResponse.text || "No image analysis generated.",
      model: "gemini-3.5-flash (Multimodal Fallback)",
    };
  }
}
