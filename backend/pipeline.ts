import { fetchSentinel2Data } from "../data/planetary_computer/stac.js";
import { extractPatches } from "../ml/inference/patch_extraction.js";
import { getEncoder } from "../ml/encoders/factory.js";
import { fitClassifier, predictScene } from "../ml/classifiers/few_shot.js";
import { calculateAreaChange } from "../geospatial/area.js";

export async function runPipeline(config: any) {
  const { aoi, years, referencePatches } = config;

  console.log("Loading imagery...");
  const scenes = await fetchSentinel2Data(aoi, years);

  console.log("Preprocessing and tiling...");
  const patchesByYear = extractPatches(scenes, aoi);

  console.log("Loading Foundation Model...");
  const encoder = getEncoder("clay");

  // This will intentionally throw MODEL_UNAVAILABLE since we don't have
  // the real weights/compute environment in this Node instance.
  await encoder.load();

  console.log("Generating embeddings for reference patches...");
  const referenceEmbeddings = await encoder.encodeBatch(referencePatches);

  console.log("Fitting few-shot classifier...");
  const classifier = fitClassifier(referenceEmbeddings, "knn");

  const resultsByYear: Record<string, any> = {};
  for (const year of years) {
    console.log(`Processing year ${year}...`);
    const scenePatches = patchesByYear[year];
    const sceneEmbeddings = await encoder.encodeBatch(scenePatches);

    console.log(`Classifying year ${year}...`);
    const predictions = predictScene(classifier, sceneEmbeddings);
    resultsByYear[year] = predictions;
  }

  console.log("Calculating area change...");
  const areaStats = calculateAreaChange(resultsByYear, aoi);

  return {
    status: "SUCCESS",
    scenes,
    areaStats,
    predictions: resultsByYear,
  };
}
