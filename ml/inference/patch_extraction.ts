import type { EODataMetadata } from "../../data/planetary_computer/stac.js";

export function extractPatches(scenes: EODataMetadata[], aoi: any) {
  // In a real implementation, this would use sharp or gdal to
  // crop the full sentinel-2 tile into 224x224 patches for the foundation model.
  const patchesByYear: Record<string, any[]> = {};
  for (const scene of scenes) {
    // Preserve geospatial metadata throughout processing
    patchesByYear[scene.year] = [
      {
        id: `patch_${scene.id}_1`,
        coordinates: aoi.bbox || scene.bbox,
        image_url: scene.sourceUrl,
        metadata: {
          acquisitionDate: scene.acquisitionDate,
          crs: scene.crs,
          spatialResolution: scene.spatialResolution,
          cloudCoverage: scene.cloudCoverage,
          tileIdentifier: scene.tileIdentifier,
          bands: scene.bands
        }
      },
    ];
  }
  return patchesByYear;
}
