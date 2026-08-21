import * as turf from "@turf/turf";

export function calculateAreaChange(resultsByYear: any, aoi: any) {
  // In a full implementation, this iterates over classified patches,
  // intersects them with the AOI, and sums the area by class.
  return {
    baseline_year: Object.keys(resultsByYear)[0],
    latest_year: Object.keys(resultsByYear)[Object.keys(resultsByYear).length - 1],
    classes: {
      water: {
        absolute_change_km2: 0,
        percentage_change: 0,
      },
      wetland: {
        absolute_change_km2: 0,
        percentage_change: 0,
      },
    },
  };
}
