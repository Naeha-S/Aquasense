import { ClayEncoder } from "./clay.js";

export interface EOEncoder {
  load(): Promise<void>;
  encodeBatch(patches: any[]): Promise<number[][]>;
}

export function getEncoder(name: string): EOEncoder {
  if (name === "clay") {
    return new ClayEncoder();
  }
  // Default to Clay for now
  return new ClayEncoder();
}
