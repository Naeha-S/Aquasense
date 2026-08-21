/**
 * Raster analysis utilities for NDWI hydrological thresholding, temporal differencing,
 * and high-performance Look-Up Table (LUT) color ramp visualization.
 * NDWI raster images from Planetary Computer are rescaled [-1, 1] -> [0, 255] grayscale.
 */

import { ColorRampId, getCachedRampLut } from './colorRamps';

// Image element cache to avoid refetching over the network on slider threshold adjustments
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
 * Colorizes a grayscale NDWI raster using a selected scientific Color Ramp LUT.
 * Can optionally mask out pixels below threshold or render full continuous false-color spectrum.
 */
export async function colorizeNdwiRaster(
  imageUrl: string,
  rampId: ColorRampId = 'viridis',
  options?: {
    threshold?: number;
    maskNonWater?: boolean;
    waterAlpha?: number;
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
    const rawVal = data[i]; // Grayscale intensity [0, 255]

    if (maskNonWater && rawVal <= cutoff) {
      // Subdued background for dry / non-water terrain
      data[i] = 20;
      data[i + 1] = 20;
      data[i + 2] = 20;
      data[i + 3] = 60; // Semi-transparent
    } else {
      const lutIdx = rawVal * 3;
      data[i] = lut[lutIdx];       // R
      data[i + 1] = lut[lutIdx + 1]; // G
      data[i + 2] = lut[lutIdx + 2]; // B
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
 * based on a specific NDWI threshold, accented with the active color ramp aesthetics.
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
      // Water Extent Lost (Desiccation / Recession) -> Vivid Signal Red/Amber
      diffImageData.data[i] = 239;
      diffImageData.data[i + 1] = 68;
      diffImageData.data[i + 2] = 68;
      diffImageData.data[i + 3] = 255;
    } else if (!isWaterA && isWaterB) {
      // Water Extent Gained (Inundation / Expansion) -> Electric Blue/Cyan
      diffImageData.data[i] = 59;
      diffImageData.data[i + 1] = 130;
      diffImageData.data[i + 2] = 246;
      diffImageData.data[i + 3] = 255;
    } else if (isWaterA && isWaterB) {
      // Persistent Unchanged Water -> Uses dynamic LUT color sampled at water intensity
      const lutIdx = valB * 3;
      diffImageData.data[i] = Math.round(lut[lutIdx] * 0.7);
      diffImageData.data[i + 1] = Math.round(lut[lutIdx + 1] * 0.7 + 40);
      diffImageData.data[i + 2] = Math.min(255, Math.round(lut[lutIdx + 2] * 0.8 + 80));
      diffImageData.data[i + 3] = 230;
    } else {
      // Non-water terrain -> Transparent
      diffImageData.data[i + 3] = 0;
    }
  }

  ctxDiff.putImageData(diffImageData, 0, 0);
  return canvasDiff.toDataURL('image/png');
}
