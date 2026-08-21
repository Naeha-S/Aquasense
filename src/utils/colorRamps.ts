/**
 * Color ramp definitions and Look-Up Table (LUT) generators for NDWI geospatial raster visualization.
 * NDWI range: [-1.0, +1.0] -> 8-bit index [0, 255].
 */

export interface ColorRampStop {
  pos: number; // 0.0 to 1.0
  r: number;
  g: number;
  b: number;
}

export type ColorRampId = 'viridis' | 'magma' | 'blue-red' | 'hydro' | 'turbo' | 'plasma';

export interface ColorRampDefinition {
  id: ColorRampId;
  name: string;
  category: string;
  description: string;
  cssGradient: string;
  stops: ColorRampStop[];
}

export const COLOR_RAMPS: Record<ColorRampId, ColorRampDefinition> = {
  viridis: {
    id: 'viridis',
    name: 'Viridis',
    category: 'Perceptual Uniform',
    description: 'Standard scientific colormap (Violet → Teal → Emerald → Yellow)',
    cssGradient: 'linear-gradient(to right, #440154, #3b528b, #21918c, #5ec962, #fde725)',
    stops: [
      { pos: 0.0, r: 68, g: 1, b: 84 },
      { pos: 0.25, r: 59, g: 82, b: 139 },
      { pos: 0.5, r: 33, g: 145, b: 140 },
      { pos: 0.75, r: 94, g: 201, b: 98 },
      { pos: 1.0, r: 253, g: 231, b: 37 }
    ]
  },
  magma: {
    id: 'magma',
    name: 'Magma',
    category: 'High Contrast',
    description: 'Thermal radiation curve (Dark Indigo → Crimson → Orange → Cream)',
    cssGradient: 'linear-gradient(to right, #000004, #51127c, #b73779, #fb8861, #fcfdbf)',
    stops: [
      { pos: 0.0, r: 0, g: 0, b: 4 },
      { pos: 0.25, r: 81, g: 18, b: 124 },
      { pos: 0.5, r: 183, g: 55, b: 121 },
      { pos: 0.75, r: 251, g: 136, b: 97 },
      { pos: 1.0, r: 252, g: 253, b: 191 }
    ]
  },
  'blue-red': {
    id: 'blue-red',
    name: 'Blue-to-Red (Diverging)',
    category: 'Hydrological Divergent',
    description: 'Divergent cool-to-warm ramp (Red dry soil → Neutral → Blue water)',
    cssGradient: 'linear-gradient(to right, #b2182b, #ef8a62, #f7f7f7, #67a9cf, #2166ac)',
    stops: [
      { pos: 0.0, r: 178, g: 24, b: 43 },   // Low NDWI / dry land
      { pos: 0.25, r: 239, g: 138, b: 98 },
      { pos: 0.5, r: 247, g: 247, b: 247 }, // 0.0 neutral transition
      { pos: 0.75, r: 103, g: 169, b: 207 },
      { pos: 1.0, r: 33, g: 102, b: 172 }   // High NDWI / open water
    ]
  },
  hydro: {
    id: 'hydro',
    name: 'Hydro Sapphire',
    category: 'Oceanographic',
    description: 'Aquatic spectral depth (Deep Navy → Electric Cyan → Ice Aqua)',
    cssGradient: 'linear-gradient(to right, #0f172a, #1e3a8a, #0284c7, #06b6d4, #67e8f9)',
    stops: [
      { pos: 0.0, r: 15, g: 23, b: 42 },
      { pos: 0.25, r: 30, g: 58, b: 138 },
      { pos: 0.5, r: 2, g: 132, b: 199 },
      { pos: 0.75, r: 6, g: 182, b: 212 },
      { pos: 1.0, r: 103, g: 232, b: 249 }
    ]
  },
  turbo: {
    id: 'turbo',
    name: 'Turbo Spectral',
    category: 'Rainbow / Multi-Band',
    description: 'Google Turbo rainbow spectrum with smoothed perceptual luminance',
    cssGradient: 'linear-gradient(to right, #30123b, #1ae4b6, #a2fc3c, #fb8022, #7a0403)',
    stops: [
      { pos: 0.0, r: 48, g: 18, b: 59 },
      { pos: 0.25, r: 26, g: 228, b: 182 },
      { pos: 0.5, r: 162, g: 252, b: 60 },
      { pos: 0.75, r: 251, g: 128, b: 34 },
      { pos: 1.0, r: 122, g: 4, b: 3 }
    ]
  },
  plasma: {
    id: 'plasma',
    name: 'Plasma',
    category: 'Perceptual Vivid',
    description: 'High-energy colormap (Deep Navy → Fuchsia → Hot Orange → Yellow)',
    cssGradient: 'linear-gradient(to right, #0d0887, #6a00a8, #b12a90, #e16462, #f0f921)',
    stops: [
      { pos: 0.0, r: 13, g: 8, b: 135 },
      { pos: 0.25, r: 106, g: 0, b: 168 },
      { pos: 0.5, r: 177, g: 42, b: 144 },
      { pos: 0.75, r: 225, g: 100, b: 98 },
      { pos: 1.0, r: 240, g: 249, b: 33 }
    ]
  }
};

/**
 * Builds a 256-entry 8-bit RGB Look-Up Table (LUT) for a color ramp
 */
export function buildRampLut(rampId: ColorRampId): Uint8ClampedArray {
  const ramp = COLOR_RAMPS[rampId] || COLOR_RAMPS.viridis;
  const lut = new Uint8ClampedArray(256 * 3); // R, G, B for each 0-255

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    // Find enclosing stops
    let lower = ramp.stops[0];
    let upper = ramp.stops[ramp.stops.length - 1];

    for (let s = 0; s < ramp.stops.length - 1; s++) {
      if (t >= ramp.stops[s].pos && t <= ramp.stops[s + 1].pos) {
        lower = ramp.stops[s];
        upper = ramp.stops[s + 1];
        break;
      }
    }

    const range = upper.pos - lower.pos;
    const factor = range === 0 ? 0 : (t - lower.pos) / range;

    const r = Math.round(lower.r + factor * (upper.r - lower.r));
    const g = Math.round(lower.g + factor * (upper.g - lower.g));
    const b = Math.round(lower.b + factor * (upper.b - lower.b));

    lut[i * 3] = r;
    lut[i * 3 + 1] = g;
    lut[i * 3 + 2] = b;
  }

  return lut;
}

const lutCache = new Map<ColorRampId, Uint8ClampedArray>();

export function getCachedRampLut(rampId: ColorRampId): Uint8ClampedArray {
  if (!lutCache.has(rampId)) {
    lutCache.set(rampId, buildRampLut(rampId));
  }
  return lutCache.get(rampId)!;
}
