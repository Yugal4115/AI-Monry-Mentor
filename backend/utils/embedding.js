const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// text-embedding-004 produces 768-dimensional embeddings (free tier)
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

/**
 * Convert a text string into a float vector using Gemini Embeddings.
 * @param {string} text
 * @returns {Promise<number[]>} embedding vector
 */
async function getVector(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values; // array of ~768 floats
}

module.exports = { getVector };
