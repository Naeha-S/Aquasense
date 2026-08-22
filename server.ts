import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { runPipeline } from "./backend/pipeline.js";
import { generateEcologicalAnalysis, analyzeFieldImage, chatWithHydrologist } from "./backend/ai.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route for the ML pipeline
  app.post("/api/pipeline/run", async (req, res) => {
    try {
      const result = await runPipeline(req.body);
      res.json(result);
    } catch (error: any) {
      if (
        error.code === "MODEL_UNAVAILABLE" ||
        error.message?.includes("MODEL_UNAVAILABLE")
      ) {
        res
          .status(503)
          .json({ error: "MODEL_UNAVAILABLE", message: error.message });
      } else if (error.code === "DATA_SOURCE_UNAVAILABLE") {
        res
          .status(503)
          .json({ error: "DATA_SOURCE_UNAVAILABLE", message: error.message });
      } else {
        res
          .status(500)
          .json({ error: "INTERNAL_ERROR", message: error.message });
      }
    }
  });

  // API Route for Ecological Gemini Analysis (Thinking, Search, Maps, Flash-Lite)
  app.post("/api/ai/ecological-analysis", async (req, res) => {
    try {
      const result = await generateEcologicalAnalysis(req.body);
      res.json(result);
    } catch (error: any) {
      console.error("Ecological Analysis Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate ecological synthesis" });
    }
  });

  // API Route for Field Photo / Satellite Raster Image Understanding
  app.post("/api/ai/image-analysis", async (req, res) => {
    try {
      const { imageBase64, mimeType, prompt } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }
      const result = await analyzeFieldImage(imageBase64, mimeType || "image/jpeg", prompt);
      res.json(result);
    } catch (error: any) {
      console.error("Image Analysis Error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze image" });
    }
  });

  // API Route for Interactive Hydrological Chatbot / Natural Language Copilot
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const result = await chatWithHydrologist(req.body);
      res.json(result);
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ error: error.message || "Failed to process chat query" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
