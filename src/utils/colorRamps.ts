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

export type ColorRampId = 'viridis' | 'magma' | 'blue-red' | 'hydro' | 'turbo' | 'plasma' | 'bathymetry' | 'turbidity' | 'chlorophyll' | 'cdom';

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
  },
  bathymetry: {
    id: 'bathymetry',
    name: 'Bathymetric Depth',
    category: '3D Topography',
    description: 'Underwater depth gradient (Shallow Cyan → Submerged Azure → Deep Navy Abyssal)',
    cssGradient: 'linear-gradient(to right, #a5f3fc, #38bdf8, #0284c7, #1e3a8a, #030712)',
    stops: [
      { pos: 0.0, r: 165, g: 243, b: 252 }, // 0m shoreline
      { pos: 0.25, r: 56, g: 189, b: 248 },
      { pos: 0.5, r: 2, g: 132, b: 199 },
      { pos: 0.75, r: 30, g: 58, b: 138 },
      { pos: 1.0, r: 3, g: 7, b: 18 }       // Deep bed
    ]
  },
  turbidity: {
    id: 'turbidity',
    name: 'NDTI Turbidity / TSS',
    category: 'Water Quality',
    description: 'Suspended sediment loading (Clear Teal → Mild Silt Amber → Heavy Turbid Brown)',
    cssGradient: 'linear-gradient(to right, #06b6d4, #3b82f6, #eab308, #d97706, #78350f)',
    stops: [
      { pos: 0.0, r: 6, g: 182, b: 212 },   // Clear water (< 5 NTU)
      { pos: 0.25, r: 59, g: 130, b: 246 },
      { pos: 0.5, r: 234, g: 179, b: 8 },   // Moderate suspended sediment
      { pos: 0.75, r: 217, g: 119, b: 6 },
      { pos: 1.0, r: 120, g: 53, b: 15 }    // High silt / runoff plume (> 60 NTU)
    ]
  },
  chlorophyll: {
    id: 'chlorophyll',
    name: 'Chlorophyll-a & Algae',
    category: 'Water Quality',
    description: 'Algal bloom risk & eutrophication (Clear Blue → Mesotrophic Emerald → Severe Bloom Red)',
    cssGradient: 'linear-gradient(to right, #0284c7, #10b981, #84cc16, #eab308, #ef4444)',
    stops: [
      { pos: 0.0, r: 2, g: 132, b: 199 },   // Oligotrophic (Clear water)
      { pos: 0.25, r: 16, g: 185, b: 129 }, // Mesotrophic
      { pos: 0.5, r: 132, g: 204, b: 22 },  // Eutrophic algae
      { pos: 0.75, r: 234, g: 179, b: 8 },  // High bloom risk
      { pos: 1.0, r: 239, g: 68, b: 68 }    // Hypertrophic / Toxic scum warning
    ]
  },
  cdom: {
    id: 'cdom',
    name: 'CDOM Organic Carbon',
    category: 'Water Quality',
    description: 'Colored Dissolved Organic Matter (Low Cyan → Moderate Gold → High Peat Tea Brown)',
    cssGradient: 'linear-gradient(to right, #22d3ee, #60a5fa, #f59e0b, #b45309, #451a03)',
    stops: [
      { pos: 0.0, r: 34, g: 211, b: 238 },
      { pos: 0.25, r: 96, g: 165, b: 250 },
      { pos: 0.5, r: 245, g: 158, b: 11 },  // Humic organic runoff
      { pos: 0.75, r: 180, g: 83, b: 9 },
      { pos: 1.0, r: 69, g: 26, b: 3 }      // Dense wetland peat tannin
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
