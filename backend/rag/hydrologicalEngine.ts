import {
  Spectral12dEncoder,
  getReferencePrototypes,
  deriveSceneBands,
  sampleScenePatches,
  SPECTRAL12_DIMENSIONS,
  type BandInputs,
  type BBox,
} from "../../ml/encoders/spectral_12d.js";
import { FewShotClassifier, INITIAL_CLASSES } from "../../ml/classifiers/few_shot.js";
import {
  calculateBboxAreaKm2,
  computeAreaChange,
  type YearClassResult,
} from "../../geospatial/area.js";
import { KnowledgeRetriever } from "./retriever.js";
import { KNOWLEDGE_CORPUS } from "./knowledge_corpus.js";
import { synthesizeAssessment } from "./synthesizer.js";

export interface LocalEngineInput {
  bbox: BBox;
  years: string[] | [string, string];
  waterBody?: string;
  patchCount?: number;
  topK?: number;
}

export interface SceneYearAnalysis {
  year: string;
  bboxAreaKm2: number;
  patchCount: number;
  feature12D: number[];
  indices: Record<string, number>;
  classification: {
    dominant: string;
    classes: Record<string, { fraction: number; km2: number }>;
    probabilities: Record<string, number>;
  };
  classifierMethod: string;
}

export interface EngineResult {
  status: string;
  encoder: string;
  bbox: BBox;
  bboxAreaKm2: number;
  waterBody?: string;
  years: string[];
  perYear: SceneYearAnalysis[];
  areaStats: any;
  retrievedChunks?: ReturnType<KnowledgeRetriever["retrieve"]>;
  synthesis?: string;
}

/**
 * Runs the few-shot classifier over a deterministic sample of scene patches
 * for a single epoch, returning the mean 12-D signature, radiometric
 * indices, and per-class land-cover fractions (scaled to km² via AOI area).
 */
export async function analyzeScene12D(
  bbox: BBox,
  year: string | number,
  waterBody?: string,
  patchCount = 240
): Promise<SceneYearAnalysis> {
  const encoder = new Spectral12dEncoder();

  // Reference prototypes -> 12-D reference embeddings.
  const prototypes = getReferencePrototypes();
  const refEmbeddings = await encoder.encodeBatch(prototypes.map((p) => p.bands));
  const refLabels = prototypes.map((p) => p.label);

  // Scene -> sampled patch signatures -> 12-D scene embeddings.
  const base = deriveSceneBands(bbox, year, waterBody);
  const scenePatches = sampleScenePatches(base, patchCount);
  const sceneEmbeddings = await encoder.encodeBatch(scenePatches);

  const clf = new FewShotClassifier("logistic_regression", {
    initialClasses: [...INITIAL_CLASSES],
    nNeighbors: 3,
    metric: "cosine",
  });
  clf.fit(refEmbeddings, refLabels);
  const preds = clf.predict(sceneEmbeddings);

  // Aggregate per-patch predictions into class fractions.
  const classes: Record<string, { fraction: number; km2: number }> = {};
  for (const c of INITIAL_CLASSES) classes[c] = { fraction: 0, km2: 0 };
  for (const pr of preds) {
    if (!classes[pr.class]) classes[pr.class] = { fraction: 0, km2: 0 };
    classes[pr.class].fraction += 1;
  }
  const total = preds.length || 1;

  // Average softmax probabilities across patches.
  const probSums: Record<string, number> = {};
  for (const pr of preds) {
    for (const [k, v] of Object.entries(pr.probabilities || {})) {
      probSums[k] = (probSums[k] || 0) + v;
    }
  }
  const probabilities: Record<string, number> = {};
  for (const k of Object.keys(probSums)) probabilities[k] = probSums[k] / total;

  const bboxArea = calculateBboxAreaKm2(bbox);
  let dominant = INITIAL_CLASSES[0];
  let maxFrac = -1;
  for (const c of Object.keys(classes)) {
    classes[c].fraction = classes[c].fraction / total;
    classes[c].km2 = classes[c].fraction * bboxArea;
    if (classes[c].fraction > maxFrac) {
      maxFrac = classes[c].fraction;
      dominant = c;
    }
  }

  // Mean 12-D vector across the scene sample.
  const mean = new Array(12).fill(0);
  for (const e of sceneEmbeddings) {
    for (let i = 0; i < 12; i++) mean[i] += e[i];
  }
  for (let i = 0; i < 12; i++) mean[i] /= sceneEmbeddings.length;

  const indices: Record<string, number> = {};
  SPECTRAL12_DIMENSIONS.forEach((d, i) => {
    indices[d] = mean[i];
  });

  return {
    year: String(year),
    bboxAreaKm2: bboxArea,
    patchCount: preds.length,
    feature12D: mean,
    indices,
    classification: { dominant, classes, probabilities },
    classifierMethod: "logistic_regression",
  };
}

function buildRagQuery(
  waterBody: string | undefined,
  perYear: SceneYearAnalysis[],
  areaStats: any
): string {
  const parts: string[] = [];
  if (waterBody) parts.push(waterBody.replace(/_/g, " "));

  for (const py of perYear) {
    const w = py.classification.classes.water?.fraction ?? 0;
    const wqi = py.indices["WQI"] ?? 0;
    const ndti = py.indices["NDTI"] ?? 0;
    const ndci = py.indices["NDCI"] ?? 0;
    parts.push(
      `water fraction ${(w * 100).toFixed(0)}% WQI ${wqi.toFixed(0)} turbidity NDTI ${ndti.toFixed(
        2
      )} chlorophyll NDCI ${ndci.toFixed(2)} dominant ${py.classification.dominant}`
    );
  }

  const waterChange = areaStats?.classes?.water?.percentage_change;
  if (typeof waterChange === "number") {
    parts.push(`water ${waterChange > 0 ? "gained" : "lost"} ${Math.abs(waterChange).toFixed(1)}%`);
  }

  parts.push(
    "wetland conservation Ramsar CPCB water quality eutrophication urban encroachment monsoon rainfall"
  );
  return parts.join(" ");
}

/**
 * End-to-end local hydrological engine: 12-D spectral extraction +
 * few-shot classification + per-class area quantification + RAG retrieval +
 * structured synthesis. Fully deterministic and cloud-free.
 */
export async function runLocalHydrologicalEngine(
  input: LocalEngineInput,
  withRag = true
): Promise<EngineResult> {
  const years = (Array.isArray(input.years) ? input.years : [input.years]).map(String);
  const patchCount = input.patchCount ?? 240;

  const perYear = await Promise.all(
    years.map((y) => analyzeScene12D(input.bbox, y, input.waterBody, patchCount))
  );

  const yearClassResults: YearClassResult[] = perYear.map((p) => ({
    year: p.year,
    bboxAreaKm2: p.bboxAreaKm2,
    dominant: p.classification.dominant,
    classes: p.classification.classes,
  }));
  const areaStats = computeAreaChange(yearClassResults);

  const bboxArea = perYear.length ? perYear[0].bboxAreaKm2 : calculateBboxAreaKm2(input.bbox);

  const result: EngineResult = {
    status: "SUCCESS",
    encoder: "spectral_12d",
    bbox: input.bbox,
    bboxAreaKm2: bboxArea,
    waterBody: input.waterBody,
    years,
    perYear,
    areaStats,
  };

  if (withRag) {
    const retriever = new KnowledgeRetriever(KNOWLEDGE_CORPUS);
    const query = buildRagQuery(input.waterBody, perYear, areaStats);
    const topK = input.topK ?? 4;
    const retrievedChunks = retriever.retrieve(query, topK);
    const synthesis = synthesizeAssessment({
      waterBody: input.waterBody,
      bbox: input.bbox,
      years,
      perYear,
      areaStats,
      retrievedChunks,
    });
    result.retrievedChunks = retrievedChunks;
    result.synthesis = synthesis;
  }

  return result;
}
