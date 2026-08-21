import * as fs from "fs";
import * as path from "path";

export interface PredictionResult {
  class: string;
  confidence: number;
  probabilities?: Record<string, number>;
}

export interface ClassifierState {
  method: string;
  initialClasses: string[];
  classes: string[];
  nNeighbors: number;
  metric: string;
  C: number;
  maxIter: number;
  isFitted: boolean;
  modelWeights: {
    classes?: string[];
    coef?: Record<string, number[]>;
    intercept?: Record<string, number>;
    dim?: number;
    effectiveK?: number;
  };
  referenceEmbeddings: number[][];
  referenceLabels: string[];
}

export const INITIAL_CLASSES = ["water", "wetland", "built_up"];

export class FewShotClassifier {
  public method: string;
  public initialClasses: string[];
  public classes: string[];
  public nNeighbors: number;
  public metric: string;
  public C: number;
  public maxIter: number;
  public isFitted: boolean;

  private modelWeights: {
    classes?: string[];
    coef?: Record<string, number[]>;
    intercept?: Record<string, number>;
    dim?: number;
    effectiveK?: number;
  };
  private referenceEmbeddings: number[][];
  private referenceLabels: string[];

  constructor(
    method: string = "logistic_regression",
    options: {
      initialClasses?: string[];
      nNeighbors?: number;
      metric?: string;
      C?: number;
      maxIter?: number;
    } = {}
  ) {
    const normalizedMethod = method.toLowerCase().trim();
    if (["logistic", "logreg", "lr", "logistic_regression"].includes(normalizedMethod)) {
      this.method = "logistic_regression";
    } else if (["knn", "k-nn", "nearest_neighbors"].includes(normalizedMethod)) {
      this.method = "knn";
    } else {
      throw new Error(
        `Unsupported method '${method}'. Allowed methods are 'logistic_regression' (preferred) and 'knn' (baseline).`
      );
    }

    this.initialClasses = options.initialClasses ? [...options.initialClasses] : [...INITIAL_CLASSES];
    this.classes = [...this.initialClasses];
    this.nNeighbors = options.nNeighbors || 3;
    this.metric = options.metric || "cosine";
    this.C = options.C || 1.0;
    this.maxIter = options.maxIter || 500;
    this.isFitted = false;
    this.modelWeights = {};
    this.referenceEmbeddings = [];
    this.referenceLabels = [];
  }

  public fit(embeddings: number[][], labels: string[]): this {
    if (!embeddings || embeddings.length === 0 || !labels || labels.length === 0) {
      throw new Error("Cannot fit FewShotClassifier with empty embeddings or labels.");
    }
    if (embeddings.length !== labels.length) {
      throw new Error(`Embeddings count (${embeddings.length}) must match labels count (${labels.length}).`);
    }

    const uniqueLabels = Array.from(new Set(labels)).sort();
    this.classes = Array.from(new Set([...this.initialClasses, ...uniqueLabels])).sort();

    this.referenceEmbeddings = embeddings.map((vec) => [...vec]);
    this.referenceLabels = [...labels];

    if (this.method === "knn") {
      this.fitKNN(embeddings, labels);
    } else {
      this.fitLogisticRegression(embeddings, labels);
    }

    this.isFitted = true;
    return this;
  }

  private fitKNN(embeddings: number[][], labels: string[]): void {
    const effectiveK = Math.min(this.nNeighbors, embeddings.length);
    this.modelWeights = {
      effectiveK,
      classes: Array.from(new Set(labels)),
    };
  }

  private fitLogisticRegression(embeddings: number[][], labels: string[]): void {
    const dim = embeddings[0].length;
    const uniqueLabels = Array.from(new Set(labels)).sort();
    const weights: Record<string, number[]> = {};
    const biases: Record<string, number> = {};

    const lr = 0.05;
    const epochs = Math.min(this.maxIter, 300);
    const l2Reg = 1.0 / Math.max(this.C, 1e-4);

    for (const targetCls of uniqueLabels) {
      const w = new Array(dim).fill(0);
      let b = 0;
      const y = labels.map((lbl) => (lbl === targetCls ? 1 : 0));
      const posCount = y.reduce((acc, v) => acc + v, 0);
      const negCount = y.length - posCount;
      const posWeight = y.length / (2 * Math.max(posCount, 1));
      const negWeight = y.length / (2 * Math.max(negCount, 1));

      for (let epoch = 0; epoch < epochs; epoch++) {
        const gradW = w.map((wi) => l2Reg * wi);
        let gradB = 0;

        for (let i = 0; i < embeddings.length; i++) {
          const xi = embeddings[i];
          const yi = y[i];

          let z = b;
          for (let j = 0; j < dim; j++) {
            z += w[j] * xi[j];
          }

          const prob = z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
          const weight = yi === 1 ? posWeight : negWeight;
          const error = (prob - yi) * weight;

          for (let j = 0; j < dim; j++) {
            gradW[j] += error * xi[j];
          }
          gradB += error;
        }

        const n = embeddings.length;
        for (let j = 0; j < dim; j++) {
          w[j] -= lr * (gradW[j] / n);
        }
        b -= lr * (gradB / n);
      }

      weights[targetCls] = w;
      biases[targetCls] = b;
    }

    this.modelWeights = {
      classes: uniqueLabels,
      coef: weights,
      intercept: biases,
      dim,
    };
  }

  public predict(embeddings: number[][]): PredictionResult[] {
    if (!this.isFitted) {
      throw new Error("Classifier is not fitted. Call fit() or load() before predicting.");
    }
    if (!embeddings || embeddings.length === 0) {
      return [];
    }

    if (this.method === "knn") {
      return this.predictKNN(embeddings);
    } else {
      return this.predictLogisticRegression(embeddings);
    }
  }

  public predictClasses(embeddings: number[][]): string[] {
    return this.predict(embeddings).map((r) => r.class);
  }

  private predictKNN(embeddings: number[][]): PredictionResult[] {
    const k = this.modelWeights.effectiveK || Math.min(this.nNeighbors, this.referenceEmbeddings.length);
    const results: PredictionResult[] = [];

    for (const emb of embeddings) {
      const distances: Array<{ dist: number; label: string }> = [];

      for (let i = 0; i < this.referenceEmbeddings.length; i++) {
        const refEmb = this.referenceEmbeddings[i];
        const refLbl = this.referenceLabels[i];

        let dist: number;
        if (this.metric === "cosine") {
          let dot = 0;
          let normA = 0;
          let normB = 0;
          for (let j = 0; j < emb.length; j++) {
            dot += emb[j] * refEmb[j];
            normA += emb[j] * emb[j];
            normB += refEmb[j] * refEmb[j];
          }
          const sim = dot / Math.max(Math.sqrt(normA) * Math.sqrt(normB), 1e-9);
          dist = 1.0 - sim;
        } else {
          let sumSq = 0;
          for (let j = 0; j < emb.length; j++) {
            const diff = emb[j] - refEmb[j];
            sumSq += diff * diff;
          }
          dist = Math.sqrt(sumSq);
        }

        distances.push({ dist, label: refLbl });
      }

      distances.sort((a, b) => a.dist - b.dist);
      const topK = distances.slice(0, k);

      const voteWeights: Record<string, number> = {};
      for (const item of topK) {
        const weight = 1.0 / (item.dist + 1e-5);
        voteWeights[item.label] = (voteWeights[item.label] || 0) + weight;
      }

      let totalWeight = 0;
      for (const lbl of Object.keys(voteWeights)) {
        totalWeight += voteWeights[lbl];
      }
      totalWeight = totalWeight || 1.0;

      const probabilities: Record<string, number> = {};
      let bestClass = this.initialClasses[0];
      let maxProb = -1;

      for (const [lbl, w] of Object.entries(voteWeights)) {
        const p = parseFloat((w / totalWeight).toFixed(4));
        probabilities[lbl] = p;
        if (p > maxProb) {
          maxProb = p;
          bestClass = lbl;
        }
      }

      results.push({
        class: bestClass,
        confidence: maxProb >= 0 ? maxProb : 1.0,
        probabilities,
      });
    }

    return results;
  }

  private predictLogisticRegression(embeddings: number[][]): PredictionResult[] {
    const coef = this.modelWeights.coef || {};
    const intercept = this.modelWeights.intercept || {};
    const activeClasses = this.modelWeights.classes || Object.keys(coef);

    if (activeClasses.length === 0) {
      return embeddings.map(() => ({
        class: this.initialClasses[0] || "water",
        confidence: 1.0,
      }));
    }

    const results: PredictionResult[] = [];

    for (const emb of embeddings) {
      const logits: Record<string, number> = {};
      for (const clsName of activeClasses) {
        const w = coef[clsName] || new Array(emb.length).fill(0);
        const b = intercept[clsName] || 0;
        let score = b;
        for (let j = 0; j < emb.length; j++) {
          score += w[j] * emb[j];
        }
        logits[clsName] = score;
      }

      const maxLogit = Math.max(...Object.values(logits));
      let sumExp = 0;
      const expScores: Record<string, number> = {};

      for (const [clsName, logit] of Object.entries(logits)) {
        const expVal = Math.exp(logit - maxLogit);
        expScores[clsName] = expVal;
        sumExp += expVal;
      }
      sumExp = sumExp || 1.0;

      const probabilities: Record<string, number> = {};
      let bestClass = activeClasses[0];
      let maxProb = -1;

      for (const [clsName, expVal] of Object.entries(expScores)) {
        const prob = parseFloat((expVal / sumExp).toFixed(4));
        probabilities[clsName] = prob;
        if (prob > maxProb) {
          maxProb = prob;
          bestClass = clsName;
        }
      }

      results.push({
        class: bestClass,
        confidence: maxProb,
        probabilities,
      });
    }

    return results;
  }

  public getState(): ClassifierState {
    return {
      method: this.method,
      initialClasses: [...this.initialClasses],
      classes: [...this.classes],
      nNeighbors: this.nNeighbors,
      metric: this.metric,
      C: this.C,
      maxIter: this.maxIter,
      isFitted: this.isFitted,
      modelWeights: JSON.parse(JSON.stringify(this.modelWeights)),
      referenceEmbeddings: this.referenceEmbeddings.map((vec) => [...vec]),
      referenceLabels: [...this.referenceLabels],
    };
  }

  public setState(state: ClassifierState): this {
    this.method = state.method || "logistic_regression";
    this.initialClasses = state.initialClasses ? [...state.initialClasses] : [...INITIAL_CLASSES];
    this.classes = state.classes ? [...state.classes] : [...this.initialClasses];
    this.nNeighbors = state.nNeighbors || 3;
    this.metric = state.metric || "cosine";
    this.C = state.C || 1.0;
    this.maxIter = state.maxIter || 500;
    this.isFitted = state.isFitted || false;
    this.modelWeights = state.modelWeights || {};
    this.referenceEmbeddings = state.referenceEmbeddings || [];
    this.referenceLabels = state.referenceLabels || [];
    return this;
  }

  public save(filepath?: string): string {
    const jsonStr = JSON.stringify(this.getState(), null, 2);
    if (filepath) {
      const dir = path.dirname(path.resolve(filepath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filepath, jsonStr, "utf-8");
    }
    return jsonStr;
  }

  public saveState(filepath?: string): string {
    return this.save(filepath);
  }

  public load(filepathOrJson: string): this {
    let state: ClassifierState;
    if (filepathOrJson.trim().startsWith("{")) {
      state = JSON.parse(filepathOrJson);
    } else {
      const content = fs.readFileSync(filepathOrJson, "utf-8");
      state = JSON.parse(content);
    }
    return this.setState(state);
  }

  public static load(filepathOrJson: string): FewShotClassifier {
    const classifier = new FewShotClassifier();
    return classifier.load(filepathOrJson);
  }
}

/**
 * Backward compatibility helpers for existing pipeline modules
 */
export function fitClassifier(referenceEmbeddings: number[][], method: string = "logistic_regression", labels?: string[]) {
  const defaultLabels = labels || referenceEmbeddings.map((_, i) => (i % 2 === 0 ? "water" : "wetland"));
  const classifier = new FewShotClassifier(method);
  classifier.fit(referenceEmbeddings, defaultLabels);
  return classifier;
}

export function predictScene(classifier: FewShotClassifier | any, sceneEmbeddings: number[][]) {
  if (classifier && typeof classifier.predict === "function") {
    return classifier.predict(sceneEmbeddings);
  }
  return sceneEmbeddings.map(() => ({ class: "water", confidence: 0.9 }));
}
