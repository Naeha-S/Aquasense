import { ClayEncoder } from "./clay.js";
import { Spectral12dEncoder } from "./spectral_12d.js";

export interface EOEncoder {
  load(): Promise<void>;
  encodeBatch(patches: any[]): Promise<number[][]>;
}

export function getEncoder(name: string): EOEncoder {
  switch (name) {
    case "clay":
      // Requires a GPU/PyTorch environment; throws MODEL_UNAVAILABLE if absent.
      return new ClayEncoder();
    case "spectral_12d":
    case "spectral":
    case "default":
    default:
      // Deterministic, dependency-free 12-D radiometric extractor is the
      // default so the local hydrological pipeline runs without cloud/GPU.
      return new Spectral12dEncoder();
  }
}
