const fs = require("fs");

const base = () => (process.env.ML_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

// Sends an uploaded audio file to the Python service. Returns null if it is unavailable.
exports.analyzeAudio = async (filePath, filename, mimeType) => {
  try {
    const buf = await fs.promises.readFile(filePath);
    const form = new FormData();
    form.append("file", new Blob([buf], { type: mimeType }), filename);
    const res = await fetch(`${base()}/analyze`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(20000),
    });
    return res.ok ? await res.json() : null;
  } catch (err) {
    console.warn("Python service unavailable (analyze):", err.message);
    return null;
  }
};

// Asks the Python service to rank candidate tracks. Returns null if it is unavailable.
exports.recommend = async (liked, candidates, limit = 20) => {
  try {
    const res = await fetch(`${base()}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liked, candidates, limit }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok ? await res.json() : null;
  } catch (err) {
    console.warn("Python service unavailable (recommend):", err.message);
    return null;
  }
};
