import { runLocalHydrologicalEngine } from "./rag/hydrologicalEngine.js";

/**
 * Local multi-sensor hydrological pipeline.
 *
 * Replaces the previous GPU/cloud-bound foundation-model path (which always
 * threw MODEL_UNAVAILABLE) with a self-contained, deterministic engine:
 *   1. 12-D radiometric spectral extraction (spectral_12d encoder)
 *   2. Few-shot classification (logistic regression over reference prototypes)
 *   3. Per-class area quantification (geospatial area scaling)
 *   4. Local RAG retrieval + synthesis (optional, `withRag`)
 *
 * No external network, weights, or cloud LLM dependency is required.
 */
export async function runPipeline(config: any) {
  const { aoi, years, waterBody, patchCount, topK } = config || {};
  const bbox = config?.bbox || aoi?.bbox;

  if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) {
    throw new Error(
      "bbox [minX, minY, maxX, maxY] is required for the local spectral pipeline."
    );
  }

  const yearList = years && years.length ? years : ["2019", "2025"];

  const engine = await runLocalHydrologicalEngine(
    {
      bbox: bbox as [number, number, number, number],
      years: yearList,
      waterBody: waterBody || aoi?.waterBody,
      patchCount,
      topK,
    },
    true
  );

  return {
    status: "SUCCESS",
    encoder: engine.encoder,
    bbox: engine.bbox,
    bboxAreaKm2: engine.bboxAreaKm2,
    waterBody: engine.waterBody,
    years: engine.years,
    perYear: engine.perYear,
    areaStats: engine.areaStats,
    retrievedChunks: engine.retrievedChunks,
    synthesis: engine.synthesis,
  };
}
