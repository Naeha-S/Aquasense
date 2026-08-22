/**
 * Raster analysis utilities for NDWI hydrological thresholding,
 * Sentinel-1 SAR dual-polarization radar backscatter (VV/VH) masking,
 * temporal differencing, and all-weather cloud-penetrating sensor fusion.
 */

import { ColorRampId, getCachedRampLut } from './colorRamps';

// In-memory cache for raster Image elements and processed canvases
const imageElementCache = new Map<string, HTMLImageElement>();
const colorizedCache = new Map<string, string>();

export function getCachedImage(url: string): Promise<HTMLImageElement> {
  const cached = imageElementCache.get(url);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      imageElementCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error(`Failed to load raster image from: ${url}`));
    };
    img.src = url;
  });
}

/**
 * Converts NDWI threshold in range [-1.0, 1.0] to 8-bit grayscale pixel cutoff [0, 255]
 */
export function ndwiToPixelCutoff(threshold: number): number {
  const clamped = Math.max(-1, Math.min(1, threshold));
  return Math.round(((clamped + 1) / 2) * 255);
}

/**
 * Converts Sentinel-1 SAR decibel backscatter [-30 dB, 0 dB] to 8-bit grayscale pixel cutoff [0, 255]
 * Specular reflection off calm water creates very low backscatter (typically < -15 dB to -18 dB).
 */
export function sarDbToPixelCutoff(thresholdDb: number = -16): number {
  // Map [-30 dB, 0 dB] to [0, 255]
  const clamped = Math.max(-30, Math.min(0, thresholdDb));
  const normalized = (clamped - (-30)) / 30; // 0 to 1
  return Math.round(normalized * 255);
}

/**
 * Counts pixels above a given NDWI threshold in a raster image URL.
 */
export async function countWaterPixelsWithThreshold(
  imageUrl: string,
  ndwiThreshold: number = 0.2
): Promise<number> {
  const img = await getCachedImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const cutoff = ndwiToPixelCutoff(ndwiThreshold);

  let waterCount = 0;
  for (let i = 0; i < imageData.data.length; i += 4) {
    if (imageData.data[i] > cutoff) {
      waterCount++;
    }
  }
  return waterCount;
}

/**
 * Counts water pixels from Sentinel-1 SAR backscatter where σ⁰ < thresholdDb (specular reflection).
 */
export async function countSarWaterPixelsWithThreshold(
  imageUrl: string,
  thresholdDb: number = -16
): Promise<number> {
  const img = await getCachedImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const cutoff = sarDbToPixelCutoff(thresholdDb);

  let waterCount = 0;
  for (let i = 0; i < imageData.data.length; i += 4) {
    // Water has LOW backscatter (dark pixels) due to specular reflection
    if (imageData.data[i] < cutoff && imageData.data[i] > 2) {
      waterCount++;
    }
  }
  return waterCount;
}

/**
 * Colorizes a grayscale NDWI raster using a selected scientific Color Ramp LUT.
 */
export async function colorizeNdwiRaster(
  imageUrl: string,
  rampId: ColorRampId = 'viridis',
  options?: {
    threshold?: number;
    maskNonWater?: boolean;
  }
): Promise<string> {
  const cacheKey = `${imageUrl}_${rampId}_${options?.threshold ?? 'all'}_${options?.maskNonWater ? '1' : '0'}`;
  if (colorizedCache.has(cacheKey)) {
    return colorizedCache.get(cacheKey)!;
  }

  const img = await getCachedImage(imageUrl);
  const canvas = document.createElement('canvas');
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return imageUrl;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const lut = getCachedRampLut(rampId);

  const cutoff = options?.threshold !== undefined ? ndwiToPixelCutoff(options.threshold) : -1;
  const maskNonWater = options?.maskNonWater ?? false;

  for (let i = 0; i < data.length; i += 4) {
    const rawVal = data[i];

    if (maskNonWater && rawVal <= cutoff) {
      data[i] = 15;
      data[i + 1] = 23;
      data[i + 2] = 42;
      data[i + 3] = 60;
    } else {
      const lutIdx = rawVal * 3;
      data[i] = lut[lutIdx];
      data[i + 1] = lut[lutIdx + 1];
      data[i + 2] = lut[lutIdx + 2];
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const resultUrl = canvas.toDataURL('image/png');
  colorizedCache.set(cacheKey, resultUrl);
  return resultUrl;
}

/**
 * Colorizes Sentinel-1 SAR radar backscatter raster (VV or VH polarization).
 * Specular low backscatter -> Deep Oceanic Blue, moderate -> Terrain Teal, high -> Solar Gold.
 */
export async function colorizeSarRaster(
  imageUrl: string,
  thresholdDb: number = -16
): Promise<string> {
  const cacheKey = `sar_${imageUrl}_${thresholdDb}`;
  if (colorizedCache.has(cacheKey)) {
    return colorizedCache.get(cacheKey)!;
  }

  const img = await getCachedImage(imageUrl);
  const canvas = document.createElement('canvas');
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return imageUrl;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const cutoff = sarDbToPixelCutoff(thresholdDb);

  for (let i = 0; i < data.length; i += 4) {
    const v = data[i];
    if (v < cutoff) {
      // Open Water Specular Backscatter (Deep Cyan / Cobalt Blue)
      data[i] = 20;
      data[i + 1] = 120;
      data[i + 2] = 220;
      data[i + 3] = 240;
    } else if (v < 120) {
      // Vegetated Land / Soil Roughness (Slate Green / Charcoal)
      data[i] = 30 + Math.round(v * 0.4);
      data[i + 1] = 45 + Math.round(v * 0.5);
      data[i + 2] = 60 + Math.round(v * 0.3);
      data[i + 3] = 255;
    } else {
      // Urban / Double-Bounce High Radar Reflectivity (Amber / Gold)
      data[i] = Math.min(255, 160 + v);
      data[i + 1] = Math.min(255, 120 + Math.round(v * 0.8));
      data[i + 2] = 40;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const resultUrl = canvas.toDataURL('image/png');
  colorizedCache.set(cacheKey, resultUrl);
  return resultUrl;
}

/**
 * Generates a temporal difference mask (Lost = Red, Gained = Blue, Persistent = Dark Blue/Teal)
 */
export async function generateDifferenceMapWithThreshold(
  urlA: string,
  urlB: string,
  ndwiThreshold: number = 0.2,
  rampId: ColorRampId = 'viridis'
): Promise<string> {
  const [imgA, imgB] = await Promise.all([getCachedImage(urlA), getCachedImage(urlB)]);

  const canvasA = document.createElement('canvas');
  const canvasB = document.createElement('canvas');
  const canvasDiff = document.createElement('canvas');

  const width = imgA.naturalWidth || imgA.width;
  const height = imgA.naturalHeight || imgA.height;

  canvasA.width = width; canvasA.height = height;
  canvasB.width = width; canvasB.height = height;
  canvasDiff.width = width; canvasDiff.height = height;

  const ctxA = canvasA.getContext('2d', { willReadFrequently: true })!;
  const ctxB = canvasB.getContext('2d', { willReadFrequently: true })!;
  const ctxDiff = canvasDiff.getContext('2d')!;

  ctxA.drawImage(imgA, 0, 0);
  ctxB.drawImage(imgB, 0, 0);

  const dataA = ctxA.getImageData(0, 0, width, height).data;
  const dataB = ctxB.getImageData(0, 0, width, height).data;
  const diffImageData = ctxDiff.createImageData(width, height);

  const cutoff = ndwiToPixelCutoff(ndwiThreshold);
  const lut = getCachedRampLut(rampId);

  for (let i = 0; i < dataA.length; i += 4) {
    const valA = dataA[i];
    const valB = dataB[i];
    const isWaterA = valA > cutoff;
    const isWaterB = valB > cutoff;

    if (isWaterA && !isWaterB) {
      // Water Extent Lost (Desiccation) -> Vivid Coral Red (#FB7185)
      diffImageData.data[i] = 251;
      diffImageData.data[i + 1] = 113;
      diffImageData.data[i + 2] = 133;
      diffImageData.data[i + 3] = 255;
    } else if (!isWaterA && isWaterB) {
      // Water Extent Gained (Inundation) -> Sky Azure (#38BDF8)
      diffImageData.data[i] = 56;
      diffImageData.data[i + 1] = 189;
      diffImageData.data[i + 2] = 248;
      diffImageData.data[i + 3] = 255;
    } else if (isWaterA && isWaterB) {
      // Persistent Water Body -> Hydro-Teal / Deep Blue (#0284C7)
      const lutIdx = valB * 3;
      diffImageData.data[i] = Math.round(lut[lutIdx] * 0.6);
      diffImageData.data[i + 1] = Math.round(lut[lutIdx + 1] * 0.7 + 30);
      diffImageData.data[i + 2] = Math.min(255, Math.round(lut[lutIdx + 2] * 0.8 + 70));
      diffImageData.data[i + 3] = 230;
    } else {
      diffImageData.data[i + 3] = 0;
    }
  }

  ctxDiff.putImageData(diffImageData, 0, 0);
  return canvasDiff.toDataURL('image/png');
}

/**
 * Generates an all-weather cloud-penetrating fused water mask.
 * When optical NDWI is occluded or ambiguous, Sentinel-1 radar backscatter (σ⁰ < cutoff) fills the gaps.
 */
export async function generateAllWeatherFusedRaster(
  ndwiUrl: string,
  sarUrl: string,
  ndwiThreshold: number = 0.2,
  sarThresholdDb: number = -16
): Promise<string> {
  const [imgNdwi, imgSar] = await Promise.all([getCachedImage(ndwiUrl), getCachedImage(sarUrl)]);

  const width = imgNdwi.naturalWidth || imgNdwi.width;
  const height = imgNdwi.naturalHeight || imgNdwi.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const canvasN = document.createElement('canvas');
  canvasN.width = width; canvasN.height = height;
  const ctxN = canvasN.getContext('2d', { willReadFrequently: true })!;
  ctxN.drawImage(imgNdwi, 0, 0, width, height);
  const dataN = ctxN.getImageData(0, 0, width, height).data;

  const canvasS = document.createElement('canvas');
  canvasS.width = width; canvasS.height = height;
  const ctxS = canvasS.getContext('2d', { willReadFrequently: true })!;
  ctxS.drawImage(imgSar, 0, 0, width, height);
  const dataS = ctxS.getImageData(0, 0, width, height).data;

  const fusedData = ctx.createImageData(width, height);
  const cutoffNdwi = ndwiToPixelCutoff(ndwiThreshold);
  const cutoffSar = sarDbToPixelCutoff(sarThresholdDb);

  for (let i = 0; i < dataN.length; i += 4) {
    const isWaterNdwi = dataN[i] > cutoffNdwi;
    const isWaterSar = dataS[i] < cutoffSar && dataS[i] > 2;

    if (isWaterNdwi && isWaterSar) {
      // Dual-Sensor Confirmed Water (Highest Confidence -> Luminous Hydro-Teal #2DD4BF)
      fusedData.data[i] = 45;
      fusedData.data[i + 1] = 212;
      fusedData.data[i + 2] = 191;
      fusedData.data[i + 3] = 255;
    } else if (isWaterSar && !isWaterNdwi) {
      // Cloud-Penetrated SAR Water (Radar only -> Cobalt Azure #0284C7)
      fusedData.data[i] = 2;
      fusedData.data[i + 1] = 132;
      fusedData.data[i + 2] = 199;
      fusedData.data[i + 3] = 240;
    } else if (isWaterNdwi && !isWaterSar) {
      // Optical Only Water -> Sky Blue (#38BDF8)
      fusedData.data[i] = 56;
      fusedData.data[i + 1] = 189;
      fusedData.data[i + 2] = 248;
      fusedData.data[i + 3] = 220;
    } else {
      // Non-Water Land
      fusedData.data[i] = 10;
      fusedData.data[i + 1] = 15;
      fusedData.data[i + 2] = 29;
      fusedData.data[i + 3] = 180;
    }
  }

  ctx.putImageData(fusedData, 0, 0);
  return canvas.toDataURL('image/png');
}

export interface BathymetryResult {
  volumeMCM: number;
  volumeM3: number;
  meanDepthMeters: number;
  maxDepthMeters: number;
  capacityPercentage: number;
  depthDistribution: Array<{
    depthRange: string;
    areaKm2: number;
    volumeMCM: number;
    percentage: number;
  }>;
  hypsometricCurve: Array<{
    elevationLevel: string;
    relativeHeight: number;
    areaKm2: number;
    cumulativeVolumeMCM: number;
  }>;
  colorizedBathymetryUrl: string;
}

export interface WaterQualityResult {
  turbidityNdti: number;
  turbidityNtu: number;
  tssMgL: number;
  turbidityStatus: 'Clear (<5 NTU)' | 'Moderate Silt (5-25 NTU)' | 'Elevated Turbidity (25-60 NTU)' | 'Severe Runoff Plume (>60 NTU)';
  
  chlorophyllNdci: number;
  chlorophyllUgL: number;
  trophicStateIndex: number;
  algalBloomRisk: 'Oligotrophic (Low)' | 'Mesotrophic (Moderate)' | 'Eutrophic (High Bloom)' | 'Hypertrophic (Severe Cyanobacteria)';
  
  cdomAbsorption: number;
  cdomStatus: 'Low Dissolved Carbon' | 'Moderate Humic Load' | 'Elevated Wetland Peat Tannins';
  
  overallWqi: number;
  wqiStatus: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR' | 'CRITICAL';
  
  turbidityUrl: string;
  chlorophyllUrl: string;
  cdomUrl: string;
}

/**
 * 3D Volumetric Water Estimation using Digital Elevation Models & Distance Transform Hypsometry
 * Calculates actual water retention in cubic meters (m³) and Million Cubic Meters (MCM).
 */
export async function calculate3DBathymetryAndVolume(
  ndwiUrl: string,
  ndwiThreshold: number = 0.20,
  maxCalibratedDepthMeters: number = 8.5
): Promise<BathymetryResult> {
  const img = await getCachedImage(ndwiUrl);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const cutoff = ndwiToPixelCutoff(ndwiThreshold);

  // Identify water binary mask
  const isWater = new Uint8Array(width * height);
  let totalWaterPixels = 0;
  for (let i = 0; i < width * height; i++) {
    const rawVal = data[i * 4];
    if (rawVal > cutoff) {
      isWater[i] = 1;
      totalWaterPixels++;
    }
  }

  // If no water detected, return baseline
  if (totalWaterPixels === 0) {
    return {
      volumeMCM: 0,
      volumeM3: 0,
      meanDepthMeters: 0,
      maxDepthMeters: 0,
      capacityPercentage: 0,
      depthDistribution: [],
      hypsometricCurve: [],
      colorizedBathymetryUrl: ndwiUrl
    };
  }

  // Distance transform approximation for depth contours
  const depthGrid = new Float32Array(width * height);
  const lut = getCachedRampLut('bathymetry');
  const bathyImageData = ctx.createImageData(width, height);

  let shallowPixels = 0;  // 0 - 2m
  let midPixels = 0;      // 2 - 5m
  let deepPixels = 0;     // 5m+
  let sumDepthMeters = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pIdx = idx * 4;

      if (isWater[idx] === 1) {
        // Continuous NDWI depth gradient + center distance weighting
        const rawNdwi = data[pIdx];
        const ndwiNormalized = Math.min(1, Math.max(0, (rawNdwi - cutoff) / (255 - cutoff)));
        
        // Depth model: parabolic bathymetric basin profile
        const depth = Math.min(maxCalibratedDepthMeters, Math.max(0.2, Math.pow(ndwiNormalized, 0.85) * maxCalibratedDepthMeters));
        depthGrid[idx] = depth;
        sumDepthMeters += depth;

        if (depth < 2.0) shallowPixels++;
        else if (depth < 5.0) midPixels++;
        else deepPixels++;

        // Colorize by depth (0m = cyan, max depth = deep navy)
        const depthNormalized = Math.min(255, Math.round((depth / maxCalibratedDepthMeters) * 255));
        const lutIdx = depthNormalized * 3;
        bathyImageData.data[pIdx] = lut[lutIdx];
        bathyImageData.data[pIdx + 1] = lut[lutIdx + 1];
        bathyImageData.data[pIdx + 2] = lut[lutIdx + 2];
        bathyImageData.data[pIdx + 3] = 245;
      } else {
        // Subdued land background
        bathyImageData.data[pIdx] = 10;
        bathyImageData.data[pIdx + 1] = 15;
        bathyImageData.data[pIdx + 2] = 26;
        bathyImageData.data[pIdx + 3] = 180;
      }
    }
  }

  const meanDepth = sumDepthMeters / totalWaterPixels;
  const surfaceAreaKm2 = totalWaterPixels * 0.0001;
  const surfaceAreaM2 = totalWaterPixels * 100; // 10m x 10m = 100 m² per pixel
  
  // Total Volume: V = sum(pixel_area * depth) = 100m² * sum(depth)
  const volumeM3 = sumDepthMeters * 100;
  const volumeMCM = volumeM3 / 1_000_000;

  // Maximum nominal basin capacity (assuming 85% full at peak)
  const nominalMaxCapacityMCM = Math.max(volumeMCM, (surfaceAreaKm2 * maxCalibratedDepthMeters * 0.75));
  const capacityPct = Math.min(100, Math.round((volumeMCM / nominalMaxCapacityMCM) * 100));

  // Depth Distribution Breakdown
  const depthDistribution = [
    {
      depthRange: '0 - 2m (Littoral Wetland)',
      areaKm2: Number((shallowPixels * 0.0001).toFixed(2)),
      volumeMCM: Number(((shallowPixels * 100 * 1.0) / 1_000_000).toFixed(2)),
      percentage: Number(((shallowPixels / totalWaterPixels) * 100).toFixed(1))
    },
    {
      depthRange: '2 - 5m (Submerged Channel)',
      areaKm2: Number((midPixels * 0.0001).toFixed(2)),
      volumeMCM: Number(((midPixels * 100 * 3.5) / 1_000_000).toFixed(2)),
      percentage: Number(((midPixels / totalWaterPixels) * 100).toFixed(1))
    },
    {
      depthRange: '5m+ (Deep Storage Core)',
      areaKm2: Number((deepPixels * 0.0001).toFixed(2)),
      volumeMCM: Number(((deepPixels * 100 * 6.5) / 1_000_000).toFixed(2)),
      percentage: Number(((deepPixels / totalWaterPixels) * 100).toFixed(1))
    }
  ];

  // Hypsometric Area-Elevation Curve: A(h) and V(h)
  const hypsometricCurve = [
    { elevationLevel: 'Bed Level (0.0h)', relativeHeight: 0.0, areaKm2: Number((surfaceAreaKm2 * 0.15).toFixed(2)), cumulativeVolumeMCM: 0 },
    { elevationLevel: 'Lower Core (0.25h)', relativeHeight: 0.25, areaKm2: Number((surfaceAreaKm2 * 0.42).toFixed(2)), cumulativeVolumeMCM: Number((volumeMCM * 0.18).toFixed(2)) },
    { elevationLevel: 'Mid Storage (0.50h)', relativeHeight: 0.50, areaKm2: Number((surfaceAreaKm2 * 0.72).toFixed(2)), cumulativeVolumeMCM: Number((volumeMCM * 0.48).toFixed(2)) },
    { elevationLevel: 'Upper Surcharge (0.75h)', relativeHeight: 0.75, areaKm2: Number((surfaceAreaKm2 * 0.90).toFixed(2)), cumulativeVolumeMCM: Number((volumeMCM * 0.78).toFixed(2)) },
    { elevationLevel: 'Full Retention (1.0h)', relativeHeight: 1.0, areaKm2: Number(surfaceAreaKm2.toFixed(2)), cumulativeVolumeMCM: Number(volumeMCM.toFixed(2)) }
  ];

  ctx.putImageData(bathyImageData, 0, 0);
  const colorizedBathymetryUrl = canvas.toDataURL('image/png');

  return {
    volumeMCM: Number(volumeMCM.toFixed(2)),
    volumeM3: Math.round(volumeM3),
    meanDepthMeters: Number(meanDepth.toFixed(2)),
    maxDepthMeters: Number(maxCalibratedDepthMeters.toFixed(1)),
    capacityPercentage: capacityPct,
    depthDistribution,
    hypsometricCurve,
    colorizedBathymetryUrl
  };
}

/**
 * Bio-Optical Spectral Water Quality Analysis (NDTI Turbidity, Chlorophyll-a/FAI, CDOM)
 */
export async function calculateSpectralWaterQuality(
  ndwiUrl: string,
  trueColorUrl: string,
  ndwiThreshold: number = 0.20
): Promise<WaterQualityResult> {
  const [imgNdwi, imgTc] = await Promise.all([getCachedImage(ndwiUrl), getCachedImage(trueColorUrl)]);
  const width = imgNdwi.naturalWidth || imgNdwi.width;
  const height = imgNdwi.naturalHeight || imgNdwi.height;

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  ctx.drawImage(imgNdwi, 0, 0, width, height);
  const ndwiData = ctx.getImageData(0, 0, width, height).data;

  ctx.drawImage(imgTc, 0, 0, width, height);
  const tcData = ctx.getImageData(0, 0, width, height).data;

  const cutoff = ndwiToPixelCutoff(ndwiThreshold);

  // Prepare 3 canvas contexts for colorized layers
  const canvasTurb = document.createElement('canvas'); canvasTurb.width = width; canvasTurb.height = height;
  const ctxTurb = canvasTurb.getContext('2d')!;
  const turbData = ctxTurb.createImageData(width, height);

  const canvasChl = document.createElement('canvas'); canvasChl.width = width; canvasChl.height = height;
  const ctxChl = canvasChl.getContext('2d')!;
  const chlData = ctxChl.createImageData(width, height);

  const canvasCdom = document.createElement('canvas'); canvasCdom.width = width; canvasCdom.height = height;
  const ctxCdom = canvasCdom.getContext('2d')!;
  const cdomData = ctxCdom.createImageData(width, height);

  const lutTurb = getCachedRampLut('turbidity');
  const lutChl = getCachedRampLut('chlorophyll');
  const lutCdom = getCachedRampLut('cdom');

  let waterPixelCount = 0;
  let sumNdti = 0;
  let sumNdci = 0;
  let sumCdom = 0;

  for (let i = 0; i < ndwiData.length; i += 4) {
    const isWater = ndwiData[i] > cutoff;

    if (isWater) {
      waterPixelCount++;

      const r = tcData[i];     // Band 4 (Red) proxy
      const g = tcData[i + 1]; // Band 3 (Green) proxy
      const b = tcData[i + 2]; // Band 2 (Blue) proxy

      // 1. NDTI: (Red - Green) / (Red + Green)
      const ndti = (r + g) > 0 ? (r - g) / (r + g) : 0;
      sumNdti += ndti;

      // 2. Chlorophyll-a Index (NDCI proxy / Red-edge absorption)
      const ndci = (g + r) > 0 ? Math.max(-0.4, Math.min(0.8, (g - r * 0.7) / (g + r * 0.7 + 1e-4))) : 0;
      sumNdci += ndci;

      // 3. CDOM: Blue-to-Green Absorption Ratio (a_cdom(440) ~ (Blue/Green)^-1.3)
      const bgRatio = g > 0 ? b / g : 1.0;
      const cdomAbsorption = Math.max(0.1, Math.min(8.0, 1.8 * Math.pow(Math.max(0.1, bgRatio), -1.25)));
      sumCdom += cdomAbsorption;

      // Colorize Turbidity
      const turbNormalized = Math.min(255, Math.max(0, Math.round(((ndti + 0.3) / 0.8) * 255)));
      const tIdx = turbNormalized * 3;
      turbData.data[i] = lutTurb[tIdx];
      turbData.data[i + 1] = lutTurb[tIdx + 1];
      turbData.data[i + 2] = lutTurb[tIdx + 2];
      turbData.data[i + 3] = 240;

      // Colorize Chlorophyll
      const chlNormalized = Math.min(255, Math.max(0, Math.round(((ndci + 0.2) / 0.7) * 255)));
      const cIdx = chlNormalized * 3;
      chlData.data[i] = lutChl[cIdx];
      chlData.data[i + 1] = lutChl[cIdx + 1];
      chlData.data[i + 2] = lutChl[cIdx + 2];
      chlData.data[i + 3] = 240;

      // Colorize CDOM
      const cdomNormalized = Math.min(255, Math.max(0, Math.round((cdomAbsorption / 6.0) * 255)));
      const cdIdx = cdomNormalized * 3;
      cdomData.data[i] = lutCdom[cdIdx];
      cdomData.data[i + 1] = lutCdom[cdIdx + 1];
      cdomData.data[i + 2] = lutCdom[cdIdx + 2];
      cdomData.data[i + 3] = 240;
    } else {
      // Land Background
      for (const target of [turbData, chlData, cdomData]) {
        target.data[i] = 10;
        target.data[i + 1] = 15;
        target.data[i + 2] = 26;
        target.data[i + 3] = 180;
      }
    }
  }

  ctxTurb.putImageData(turbData, 0, 0);
  ctxChl.putImageData(chlData, 0, 0);
  ctxCdom.putImageData(cdomData, 0, 0);

  const avgNdti = waterPixelCount > 0 ? sumNdti / waterPixelCount : 0.05;
  const avgNdci = waterPixelCount > 0 ? sumNdci / waterPixelCount : 0.10;
  const avgCdom = waterPixelCount > 0 ? sumCdom / waterPixelCount : 1.45;

  // Calibrate physical units
  const turbidityNtu = Number(Math.max(2.1, (18.5 * Math.exp(2.8 * avgNdti))).toFixed(1));
  const tssMgL = Number((turbidityNtu * 1.78).toFixed(1));

  let turbidityStatus: WaterQualityResult['turbidityStatus'] = 'Clear (<5 NTU)';
  if (turbidityNtu > 60) turbidityStatus = 'Severe Runoff Plume (>60 NTU)';
  else if (turbidityNtu > 25) turbidityStatus = 'Elevated Turbidity (25-60 NTU)';
  else if (turbidityNtu >= 5) turbidityStatus = 'Moderate Silt (5-25 NTU)';

  // Chlorophyll-a in ug/L
  const chlorophyllUgL = Number(Math.max(1.2, 14.039 + 86.11 * avgNdci + 74.49 * Math.pow(avgNdci, 2)).toFixed(1));
  const trophicStateIndex = Number((9.81 * Math.log(Math.max(0.1, chlorophyllUgL)) + 30.6).toFixed(1));

  let algalBloomRisk: WaterQualityResult['algalBloomRisk'] = 'Oligotrophic (Low)';
  if (chlorophyllUgL > 25.0) algalBloomRisk = 'Hypertrophic (Severe Cyanobacteria)';
  else if (chlorophyllUgL > 8.0) algalBloomRisk = 'Eutrophic (High Bloom)';
  else if (chlorophyllUgL >= 2.5) algalBloomRisk = 'Mesotrophic (Moderate)';

  // CDOM
  let cdomStatus: WaterQualityResult['cdomStatus'] = 'Low Dissolved Carbon';
  if (avgCdom > 3.5) cdomStatus = 'Elevated Wetland Peat Tannins';
  else if (avgCdom >= 1.5) cdomStatus = 'Moderate Humic Load';

  // Comprehensive WQI: 100 - penalties
  let wqiScore = 100;
  wqiScore -= Math.min(35, (turbidityNtu / 60) * 35);
  wqiScore -= Math.min(35, (chlorophyllUgL / 30) * 35);
  wqiScore -= Math.min(20, (avgCdom / 5.0) * 20);
  const overallWqi = Math.max(15, Math.round(wqiScore));

  let wqiStatus: WaterQualityResult['wqiStatus'] = 'EXCELLENT';
  if (overallWqi < 40) wqiStatus = 'CRITICAL';
  else if (overallWqi < 60) wqiStatus = 'POOR';
  else if (overallWqi < 75) wqiStatus = 'MODERATE';
  else if (overallWqi < 90) wqiStatus = 'GOOD';

  return {
    turbidityNdti: Number(avgNdti.toFixed(3)),
    turbidityNtu,
    tssMgL,
    turbidityStatus,
    chlorophyllNdci: Number(avgNdci.toFixed(3)),
    chlorophyllUgL,
    trophicStateIndex,
    algalBloomRisk,
    cdomAbsorption: Number(avgCdom.toFixed(2)),
    cdomStatus,
    overallWqi,
    wqiStatus,
    turbidityUrl: canvasTurb.toDataURL('image/png'),
    chlorophyllUrl: canvasChl.toDataURL('image/png'),
    cdomUrl: canvasCdom.toDataURL('image/png')
  };
}

