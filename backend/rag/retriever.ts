import type { KnowledgeChunk } from "./knowledge_corpus.js";

export interface ScoredChunk extends KnowledgeChunk {
  score: number;
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "than", "are",
  "was", "were", "has", "have", "but", "not", "our", "its", "their", "within",
  "across", "between", "over", "under", "such", "these", "those", "which",
  "when", "where", "while", "also", "can", "may", "per", "via", "due", "near",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+.\-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * In-memory TF-IDF vector store with cosine top-K semantic retrieval.
 * Deterministic and dependency-free — built at construction time over the
 * statutory/scientific corpus and queried with live basin telemetry.
 */
export class KnowledgeRetriever {
  private chunks: KnowledgeChunk[];
  private vectors: Map<string, number>[];
  private idf: Map<string, number>;

  constructor(corpus: KnowledgeChunk[]) {
    this.chunks = corpus;
    const docs = corpus.map((c) => tokenize(`${c.text} ${c.source} ${c.category}`));

    const df = new Map<string, number>();
    for (const d of docs) {
      const seen = new Set(d);
      for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
    }

    const N = docs.length || 1;
    this.idf = new Map();
    for (const [t, n] of df) {
      this.idf.set(t, Math.log((N + 1) / (n + 1)) + 1);
    }

    this.vectors = docs.map((d) => this.tfIdf(d));
  }

  private tfIdf(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const len = tokens.length || 1;
    const vec = new Map<string, number>();
    for (const [t, c] of tf) vec.set(t, (c / len) * (this.idf.get(t) || 1));
    return vec;
  }

  private cosine(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0;
    for (const [t, w] of a) {
      const bw = b.get(t);
      if (bw) dot += w * bw;
    }
    let na = 0;
    for (const w of a.values()) na += w * w;
    let nb = 0;
    for (const w of b.values()) nb += w * w;
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  /** Returns the top-K most semantically relevant knowledge chunks. */
  retrieve(query: string, topK = 4): ScoredChunk[] {
    const qv = this.tfIdf(tokenize(query));
    const scored = this.chunks.map((c, i) => ({
      ...c,
      score: this.cosine(qv, this.vectors[i]),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored
      .slice(0, topK)
      .map((s) => ({ ...s, score: parseFloat(s.score.toFixed(3)) }));
  }
}
