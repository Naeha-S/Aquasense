import * as turf from "@turf/turf";

export type BBox = [number, number, number, number];

export interface ClassFraction {
  fraction: number;
  km2: number;
}

export interface YearClassResult {
  year: string;
  bboxAreaKm2: number;
  dominant: string;
  classes: Record<string, ClassFraction>;
}

/**
 * Computes the planar area (km²) of an AOI bounding box using geodesic
 * polygon area from Turf.js. Sentinel-2 10m pixels map to 0.0001 km² each,
 * but here we quantify at the AOI scale and distribute by classified fraction.
 */
export function calculateBboxAreaKm2(bbox: BBox): number {
  const [minX, minY, maxX, maxY] = bbox;
  const poly = turf.polygon([
    [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
      [minX, minY],
    ],
  ]);
  const areaM2 = turf.area(poly); // square meters
  return areaM2 / 1_000_000;
}

export interface AreaChangeStats {
  baseline_year: string;
  latest_year: string;
  total_area_km2: number;
  classes: Record<
    string,
    {
      baseline_km2: number;
      latest_km2: number;
      absolute_change_km2: number;
      percentage_change: number;
    }
  >;
}

/**
 * Real per-class area quantification and net transition between the baseline
 * (T0) and target (T1) classified epochs. Each class fraction (from the
 * few-shot classifier) is scaled by the AOI area to yield km² extents.
 */
export function computeAreaChange(years: YearClassResult[]): AreaChangeStats {
  const baseline = years[0];
  const latest = years[years.length - 1];

  const allClasses = new Set<string>([
    ...Object.keys(baseline.classes),
    ...Object.keys(latest.classes),
  ]);

  const classes: AreaChangeStats["classes"] = {};
  for (const c of allClasses) {
    const base = baseline.classes[c]?.km2 ?? 0;
    const lat = latest.classes[c]?.km2 ?? 0;
    const abs = lat - base;
    const pct = base ? (abs / base) * 100 : 0;
    classes[c] = {
      baseline_km2: base,
      latest_km2: lat,
      absolute_change_km2: abs,
      percentage_change: pct,
    };
  }

  return {
    baseline_year: baseline.year,
    latest_year: latest.year,
    total_area_km2: baseline.bboxAreaKm2,
    classes,
  };
}
