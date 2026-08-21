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
