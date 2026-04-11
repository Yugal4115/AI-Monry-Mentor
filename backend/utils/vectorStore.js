const fs = require("fs");
const path = require("path");

// ─── Storage Path ──────────────────────────────────────────────────────────────
const STORE_PATH = path.join(__dirname, "../data/vector_store.json");

// ─── Ensure data directory exists ──────────────────────────────────────────────
function ensureStore() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify([]));
}

// ─── Load all records ─────────────────────────────────────────────────────────
function loadStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
  } catch {
    return [];
  }
}

// ─── Persist records ──────────────────────────────────────────────────────────
function saveStore(records) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(records, null, 2));
}

// ─── Cosine similarity between two vectors ────────────────────────────────────
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Upsert (insert or update by id) ─────────────────────────────────────────
/**
 * @param {string} id      Unique identifier (e.g. shortened text or UUID)
 * @param {number[]} vector Embedding vector
 * @param {object} meta    Any extra data to store (text, userId, timestamp…)
 */
function upsert(id, vector, meta = {}) {
  const records = loadStore();
  const existingIdx = records.findIndex((r) => r.id === id);
  const record = { id, vector, meta, updatedAt: new Date().toISOString() };
  if (existingIdx !== -1) {
    records[existingIdx] = record;
  } else {
    records.push(record);
  }
  saveStore(records);
  return record;
}

// ─── Query: top-k most similar records ───────────────────────────────────────
/**
 * @param {number[]} queryVector
 * @param {number} topK           Number of results to return (default 3)
 * @param {number} threshold      Minimum similarity score 0–1 (default 0.4)
 * @returns {{ id, score, meta }[]}
 */
function query(queryVector, topK = 3, threshold = 0.4) {
  const records = loadStore();
  const scored = records
    .map((r) => ({ id: r.id, meta: r.meta, score: cosineSimilarity(queryVector, r.vector) }))
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return scored;
}

// ─── Delete a record ──────────────────────────────────────────────────────────
function deleteRecord(id) {
  const records = loadStore().filter((r) => r.id !== id);
  saveStore(records);
}

// ─── Count total stored records ───────────────────────────────────────────────
function count() {
  return loadStore().length;
}

module.exports = { upsert, query, deleteRecord, count };
