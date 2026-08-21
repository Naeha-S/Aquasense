import axios from "axios";

export interface EODataMetadata {
  id: string;
  year: number;
  acquisitionDate: string;
  spatialResolution: number; // in meters (usually 10m for RGB/NIR)
  crs: string; // EPSG code or string
  bbox: number[];
  cloudCoverage: number;
  tileIdentifier: string;
  sourceUrl: string;
  bands: string[];
  rawFeature: any;
}

export async function fetchSentinel2Data(aoi: any, years: number[]): Promise<EODataMetadata[]> {
  // STAC API URL for Planetary Computer
  const stacUrl = "https://planetarycomputer.microsoft.com/api/stac/v1/search";
  const results: EODataMetadata[] = [];

  for (const year of years) {
    let bbox = aoi.bbox;
    // Fallback bounding box if none provided
    if (!bbox) {
      bbox = [80.1, 12.8, 80.3, 13.0]; // Rough bbox for Chennai area
    }

    const payload = {
      collections: ["sentinel-2-l2a"],
      bbox: bbox,
      datetime: `${year}-01-01T00:00:00Z/${year}-12-31T23:59:59Z`,
      limit: 1,
    };

    try {
      const response = await axios.post(stacUrl, payload);
      if (response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        const props = feature.properties || {};
        
        // Extract bands from assets
        const assets = feature.assets || {};
        const bands = Object.keys(assets).filter(key => key.startsWith("B") && key.length <= 3);
        const visualAssetUrl = assets.visual?.href || assets.B04?.href || "";

        results.push({
          id: feature.id,
          year,
          acquisitionDate: props.datetime,
          spatialResolution: 10, // Default to 10m for Sentinel-2 visual/NIR bands
          crs: props["proj:epsg"] ? `EPSG:${props["proj:epsg"]}` : "EPSG:4326",
          bbox: feature.bbox || bbox,
          cloudCoverage: props["eo:cloud_cover"] || 0,
          tileIdentifier: props["s2:mgrs_tile"] || feature.id,
          sourceUrl: visualAssetUrl,
          bands: bands.length > 0 ? bands : ["B02", "B03", "B04", "B08"],
          rawFeature: feature,
        });
      } else {
        throw new Error(
          `DATA_SOURCE_UNAVAILABLE: No Sentinel-2 data found for ${year}`
        );
      }
    } catch (error: any) {
      const err = new Error(
        `DATA_SOURCE_UNAVAILABLE: Failed to fetch STAC data: ${error.message}`
      );
      (err as any).code = "DATA_SOURCE_UNAVAILABLE";
      throw err;
    }
  }
  return results;
}
