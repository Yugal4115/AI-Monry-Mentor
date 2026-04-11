const express = require('express');
const router = express.Router();
const { getHealthAnalysis, getFireRoadmap, getTaxStrategy, getChatResponse, getMFAnalysis } = require('../utils/ai');
const ChatHistory = require('../models/ChatHistory');
const authMiddleware = require('../middleware/authMiddleware');
const { getVector } = require('../utils/embedding');
const vectorStore = require('../utils/vectorStore');

router.use(authMiddleware);

// POST /api/ai/chat
router.post('/chat', async (req, res, next) => {
    try {
        const { message, history } = req.body;
        const userId = req.user.id;

        if (!message) {
            return res.status(400).json({ success: false, message: "Message is required" });
        }

        // ── Semantic Memory: store + retrieve context ──────────────────────────
        let semanticContext = [];
        try {
            // 1. Embed and store this user message for future recall
            const msgVector = await getVector(message);
            const storeId = `${userId}_${message.trim().slice(0, 60)}`;
            vectorStore.upsert(storeId, msgVector, {
                text: message.trim(),
                userId,
                savedAt: new Date().toISOString()
            });

            // 2. Search for the top-3 similar past finance patterns (excluding exact match)
            const similar = vectorStore.query(msgVector, 4);
            semanticContext = similar
                .filter(r => r.id !== storeId && r.meta.userId === userId)
                .slice(0, 3);
        } catch (vecErr) {
            // Non-fatal: if embedding fails, continue without context
            console.warn('Vector memory skip:', vecErr.message);
        }

        const reply = await getChatResponse(message, history || [], semanticContext);

        // Save to Database
        let chatRecord = await ChatHistory.findOne({ userId });
        const timestamp = new Date();
        const newMessages = [{ role: 'user', content: message, timestamp }, { role: 'assistant', content: reply, timestamp }];

        if (!chatRecord) {
            chatRecord = new ChatHistory({ userId, messages: newMessages });
        } else {
            chatRecord.messages.push(...newMessages);
        }
        await chatRecord.save();

        res.status(200).json({ success: true, data: { reply } });
    } catch (err) {
        next(err);
    }
});

// New Specialized LLM Routes
router.post('/health-analysis', async (req, res, next) => {
    try {
        const { answers } = req.body;
        const analysis = await getHealthAnalysis(answers);
        res.json({ success: true, data: { analysis } });
    } catch (err) {
        next(err);
    }
});

router.post('/fire-roadmap', async (req, res, next) => {
    try {
        const { params } = req.body;
        const roadmap = await getFireRoadmap(params);
        res.json({ success: true, data: { roadmap } });
    } catch (err) {
        next(err);
    }
});

router.post('/tax-strategy', async (req, res, next) => {
    try {
        const { data } = req.body;
        const strategy = await getTaxStrategy(data);
        res.json({ success: true, data: { strategy } });
    } catch (err) {
        next(err);
    }
});

router.post('/mf-analysis', async (req, res, next) => {
    try {
        const { isDemo } = req.body;
        const analysis = await getMFAnalysis(isDemo);
        res.json({ success: true, data: { analysis } });
    } catch (err) {
        next(err);
    }
});

// ─── Semantic Vector Store Routes ────────────────────────────────────────────

/**
 * POST /api/ai/store
 * Convert a finance text to a vector and save it.
 * Body: { text: string }
 */
router.post('/store', async (req, res, next) => {
    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'text is required' });
        }
        const userId = req.user.id;
        const trimmed = text.trim();
        const vector = await getVector(trimmed);
        // Use a stable ID: userId + first 60 chars of text
        const id = `${userId}_${trimmed.slice(0, 60)}`;
        const record = vectorStore.upsert(id, vector, {
            text: trimmed,
            userId,
            savedAt: new Date().toISOString()
        });
        res.json({
            success: true,
            message: 'Text stored in semantic memory',
            id: record.id,
            totalRecords: vectorStore.count()
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/ai/search
 * Find the top-k most semantically similar stored finance texts.
 * Body: { query: string, topK?: number }
 */
router.post('/search', async (req, res, next) => {
    try {
        const { query, topK = 3 } = req.body;
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'query is required' });
        }
        const queryVector = await getVector(query.trim());
        const results = vectorStore.query(queryVector, topK);
        res.json({
            success: true,
            query,
            results: results.map(r => ({
                text: r.meta.text,
                score: parseFloat(r.score.toFixed(4)),
                savedAt: r.meta.savedAt
            }))
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
