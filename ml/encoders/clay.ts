import type { EOEncoder } from "./factory.js";

export class ClayEncoder implements EOEncoder {
  async load() {
    // In a real environment, this would load PyTorch weights via ONNX or a python microservice.
    // As per instructions, do not fake the ML. If it can't load, throw MODEL_UNAVAILABLE.
    const err = new Error(
      "MODEL_UNAVAILABLE: Earth Observation Foundation Model (Clay v1) requires GPU tensor computation environment (PyTorch/CUDA) not available in this Node.js sandbox."
    );
    (err as any).code = "MODEL_UNAVAILABLE";
    throw err;
  }

  async encodeBatch(patches: any[]): Promise<number[][]> {
    throw new Error("MODEL_UNAVAILABLE");
  }
}
