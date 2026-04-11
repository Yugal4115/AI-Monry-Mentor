const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini client — uses the free tier (15 RPM, 1M tokens/day)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Sleep helper for retry delays
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core LLM call with automatic retry + exponential backoff for 429 rate limits
 */
async function askLLM(prompt, fallback, retries = 3) {
  const delays = [3000, 7000, 15000]; // 3s, 7s, 15s backoff
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text && text.trim()) return text.trim();
    } catch (error) {
      const is429 = error.status === 429 || (error.message && error.message.includes("429"));
      if (is429 && attempt < retries) {
        const waitMs = delays[attempt] || 15000;
        console.warn(`Gemini 429 rate-limit hit. Retrying in ${waitMs / 1000}s… (attempt ${attempt + 1}/${retries})`);
        await sleep(waitMs);
        continue;
      }
      console.error("Gemini API Error:", error.message);
      break;
    }
  }
  // Only use fallback if all retries exhausted
  return fallback;
}

/**
 * Chat endpoint — multi-turn conversation with retry on 429
 * @param {string} message
 * @param {Array}  history          Previous chat messages
 * @param {Array}  semanticContext  Similar past finance entries from vector search
 * @param {number} retries
 */
async function getChatResponse(message, history = [], semanticContext = [], retries = 3) {
  const delays = [3000, 7000, 15000];

  // Build context block from semantic memory results (if any)
  const contextBlock =
    semanticContext.length > 0
      ? `\n\nRELEVANT PAST FINANCE PATTERNS FROM THIS USER:\n` +
        semanticContext.map((r, i) => `${i + 1}. ${r.text}`).join("\n") +
        `\n\nUse these patterns as context to give more personalised advice.`
      : "";

  const systemPrompt =
    "You are Savira, a helpful and friendly personal finance advisor specializing in Indian markets. You give actionable advice about savings, SIPs, taxes, mutual funds, and FIRE planning. Keep responses concise (2-4 sentences). Use ₹ symbol for Indian currency." +
    contextBlock;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: systemPrompt }] },
          {
            role: "model",
            parts: [
              {
                text: "Understood! I'm Savira, your personal finance advisor. I'll help you with savings, SIPs, taxes, mutual funds, and FIRE planning. Ask me anything!",
              },
            ],
          },
          ...history.slice(-6).map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          })),
        ],
      });

      const result = await chat.sendMessage(message);
      const text = result.response.text().trim();
      if (text) return text;
    } catch (err) {
      const is429 = err.status === 429 || (err.message && err.message.includes("429"));
      if (is429 && attempt < retries) {
        const waitMs = delays[attempt] || 15000;
        console.warn(`Gemini Chat 429. Retrying in ${waitMs / 1000}s… (attempt ${attempt + 1}/${retries})`);
        await sleep(waitMs);
        continue;
      }
      console.error("Gemini Chat Error:", err.message);
      break;
    }
  }
  return "Savira is thinking deeply… Please try again in a moment. 🌟";
}

/**
 * General financial advice
 */
async function getAdvice(data, metrics) {
  const prompt = `You are an expert Indian financial advisor. Analyze this data:
- Monthly Income: ₹${data.income}
- Monthly Savings: ₹${data.savings}
- Metrics: ${JSON.stringify(metrics)}

Give 3 bullet points: one problem, one suggestion, and one action item. Be specific with Indian financial products (PPF, ELSS, NPS). Keep each point to 1 sentence.`;

  return askLLM(
    prompt,
    "Your financials look solid. Focus on building 6 months emergency fund, maximize Section 80C via ELSS, and maintain debt below 40% of income."
  );
}

/**
 * Health Score Analysis
 */
async function getHealthAnalysis(answers) {
  const prompt = `You are an expert financial health doctor for Indian users. The user answered these 6 questions:
1. Monthly Income: ₹${answers[0]}
2. Monthly Expenses: ₹${answers[1]}
3. Total Savings: ₹${answers[2]}
4. Health Insurance Cover: ₹${answers[3]}
5. Total Outstanding Debt: ₹${answers[4]}
6. Age: ${answers[5]} years

Provide exactly 3 actionable health tips as separate paragraphs. Use ₹ symbol. Reference Indian products (PPF, ELSS, NPS, Term Insurance). Be specific to their numbers.`;

  return askLLM(
    prompt,
    "Build an emergency fund covering 6 months of expenses. Your savings should be at least ₹" +
      (answers[1] * 6) +
      ".\n\nMaximize Section 80C deductions through ELSS mutual funds and PPF contributions up to ₹1.5 lakh per year.\n\nKeep your total debt below 40% of monthly income. Consider a term insurance plan of at least 10x your annual income."
  );
}

/**
 * FIRE Roadmap
 */
async function getFireRoadmap(params) {
  const prompt = `You are a FIRE (Financial Independence, Retire Early) consultant for Indian investors.
- Current Age: ${params.age}
- Monthly Income: ₹${params.income}
- Monthly Expenses: ₹${params.expense}
- Target Corpus: ₹${params.corpus}
- Expected Return: ${params.rate}%

Generate a personalized 3-sentence FIRE roadmap. Mention specific Indian instruments (Index Funds, PPF, NPS). Be encouraging and actionable.`;

  return askLLM(
    prompt,
    `Start a monthly SIP of ₹${Math.round(params.income - params.expense)} in a Nifty 50 index fund and increase it by 10% every year. Use your PPF and NPS contributions for the debt component to build a balanced portfolio. At ${params.rate}% CAGR, you're on track — stay disciplined through market cycles!`
  );
}

/**
 * Tax Strategy
 */
async function getTaxStrategy(data) {
  const prompt = `You are an Indian Tax Planning Expert for FY 2024-25.
- Gross Salary: ₹${data.salary}
- Section 80C: ₹${data.c80}
- HRA Received: ₹${data.hra}
- Other Deductions (80D, NPS): ₹${data.other}

Compare Old vs New regime for this user. Explain in 2-3 sentences which is better and why. Suggest one specific action to save more tax.`;

  return askLLM(
    prompt,
    `Based on your salary of ₹${data.salary?.toLocaleString("en-IN")}, the regime with lower effective tax rate is optimal. Consider investing in NPS for an additional ₹50,000 deduction under Section 80CCD(1B). Also review your HRA claim to ensure you're getting the maximum exemption.`
  );
}

/**
 * Mutual Fund Portfolio Analysis
 */
async function getMFAnalysis(isDemo) {
  const prompt = `You are a Mutual Fund Portfolio Analyst for Indian investors. The user has a portfolio with these characteristics:
- Mix of Large Cap, Mid Cap, and Small Cap funds
- 7 active funds
- XIRR of ~14.2%

Identify 2 specific issues (like large-cap fund overlap or high expense ratios) and suggest a concrete rebalancing action. Keep it to 3 sentences. Mention specific fund categories.`;

  return askLLM(
    prompt,
    "Your large-cap funds have significant stock overlap — consider consolidating into a single Nifty 50 index fund to reduce redundancy and save on expense ratios. Your mid-cap allocation at 25% is healthy, but the small-cap exposure could benefit from a flexi-cap fund for smoother returns. Overall XIRR of 14.2% is strong — maintain your SIP discipline and review annually."
  );
}

module.exports = {
  getAdvice,
  getHealthAnalysis,
  getFireRoadmap,
  getTaxStrategy,
  getChatResponse,
  getMFAnalysis,
};
