import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Deepgram API Key validator
app.post('/api/deepgram/test', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ success: false, error: 'API key is required' });
  }

  try {
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      headers: {
        Authorization: `Token ${apiKey.trim()}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({ success: true, projects: data.projects || [] });
    } else {
      const errText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `Deepgram API returned HTTP ${response.status}: ${errText}`,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Network error' });
  }
});

// Real-time Copilot streaming response using Gemini 3.8 Flash
app.post('/api/copilot/stream', async (req, res) => {
  const { 
    question, 
    context, 
    candidateProfile, 
    answerStyle, 
    myRole, 
    counterpartRole, 
    meetingGoal, 
    meetingType, 
    lens = 'WhatShouldISay' 
  } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const resolvedMyRole = myRole || candidateProfile?.role || 'Senior Software Engineer / Specialist';
  const resolvedCounterpartRole = counterpartRole || 'Interviewer / Client Stakeholder';
  const resolvedGoal = meetingGoal || 'Deliver maximum impact, build rapport, and reach mutual agreement';

  if (!ai) {
    // Graceful fallback advice tailored to the chosen lens if GEMINI_API_KEY is not configured
    let fallbackAnswer: string[] = [];

    switch (lens) {
      case 'WhatShouldISay':
        fallbackAnswer = [
          "💬 **What You Should Say Right Now:**\n\n",
          `"Based on our objectives, I recommend focusing on measurable ROI first. For instance, in our architecture we decoupled the streaming layer using WebSockets and 16kHz PCM, reducing latency by over 45%."\n\n`,
          "• *Quick Pivot:* \"How does that timeline align with your team's current delivery milestone?\""
        ];
        break;
      case 'FollowUp':
        fallbackAnswer = [
          "🎯 **Strategic Follow-Up Questions:**\n\n",
          `• \"What would success look like for this milestone in the next 30 days?\"\n`,
          `• \"Are there any regulatory or architectural constraints on your side we should factor in early?\"\n`,
          `• \"Who else on your side needs to sign off on this technical proposal?\"`
        ];
        break;
      case 'Negotiation':
        fallbackAnswer = [
          "🤝 **Diplomatic Negotiation Guidance:**\n\n",
          `• **Value Framing:** Re-emphasize that reliability and low latency save substantial cloud costs downstream.\n`,
          `• **Objection Handling:** \"I understand budget is sensitive here. If we phase the delivery in two sprints, we can lower initial risk while hitting the core deadline.\"\n`,
          `• **Boundary:** Avoid agreeing to unpaid scope creep without adjusting milestone dates.`
        ];
        break;
      case 'TechnicalAdvice':
        fallbackAnswer = [
          "⚡ **Technical Advice & Architectural Considerations:**\n\n",
          "• **Architecture:** Recommend asynchronous streaming over polling to keep memory bounded.\n",
          "• **Resilience:** Mention exponential backoff retry and circuit-breaking for third-party webhooks.\n",
          "• **Trade-off:** Point out that in-memory buffering reduces I/O pressure at the cost of transient RAM."
        ];
        break;
      case 'Summary':
      default:
        fallbackAnswer = [
          "📋 **Meeting Recap & Action Items:**\n\n",
          "• **Agreement 1:** Finalize API contract and streaming buffer specifications.\n",
          "• **Agreement 2:** Deliver prototype demo by end of week.\n",
          "• **Next Step:** Schedule 20-min technical sync with counterpart architecture team."
        ];
        break;
    }

    for (const chunk of fallbackAnswer) {
      res.write(`data: ${JSON.stringify({ text: chunk, lens })}\n\n`);
      await new Promise(r => setTimeout(r, 50));
    }
    res.write(`data: ${JSON.stringify({ done: true, lens })}\n\n`);
    res.end();
    return;
  }

  try {
    let lensPrompt = '';
    switch (lens) {
      case 'WhatShouldISay':
        lensPrompt = `GOAL: Give the user the exact spoken words to say right now out loud to the counterpart.
Format:
1. "Spoken Response" (1-3 conversational, highly professional, confident sentences ready to speak out loud).
2. 1 Quick Follow-Up Question to throw the ball back into their court.`;
        break;
      case 'FollowUp':
        lensPrompt = `GOAL: Suggest 3 powerful, strategic follow-up questions to ask the counterpart next to deepen alignment, discover hidden requirements, or take control of the meeting.`;
        break;
      case 'Negotiation':
        lensPrompt = `GOAL: Provide diplomatic positioning, objection handling, or negotiation guidance. Help the user defend their value, address pushback politely, or protect scope and deadlines.`;
        break;
      case 'TechnicalAdvice':
        lensPrompt = `GOAL: Provide a rapid technical critique, architectural considerations, performance bottlenecks, and trade-offs to keep in mind.`;
        break;
      case 'Summary':
        lensPrompt = `GOAL: Provide a 3-bullet executive summary of key agreements and immediate action items.`;
        break;
      default:
        lensPrompt = `GOAL: Provide brief, high-impact bulleted talking points tailored to the user's role.`;
        break;
    }

    const systemPrompt = `You are an elite, discreet real-time Meeting Copilot.
MEETING CONTEXT:
- Meeting Type: ${meetingType || 'Professional Meeting'}
- My Role: ${resolvedMyRole}
- Counterpart Role: ${resolvedCounterpartRole}
- Primary Objective: ${resolvedGoal}
- Preferred Tone: ${answerStyle || 'Natural'}

LATEST SPEECH / QUESTION FROM COUNTERPART:
"${question}"

RECENT CONVERSATION TRANSCRIPT:
${context ? context.slice(-4).join('\n') : 'No prior context'}

TASK:
${lensPrompt}

RULES:
- Keep it concise, punchy, and instantly readable while the user is actively speaking (under 100 words total).
- Match the user's role (${resolvedMyRole}) when talking to (${resolvedCounterpartRole}).
- Use clean formatting with markdown.`;

    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text, lens })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, lens })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('Gemini copilot error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Generation error', done: true, lens })}\n\n`);
    res.end();
  }
});

// List all .NET MAUI source files for the Code Explorer & Project exporter
app.get('/api/maui/files', (req, res) => {
  const mauiDir = path.resolve(process.cwd(), 'InterviewAssistant');

  function scanDir(dir: string, base: string = ''): Array<{ path: string; name: string; content: string }> {
    const results: Array<{ path: string; name: string; content: string }> = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = path.join(base, entry.name);
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        results.push(...scanDir(fullPath, relPath));
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.cs', '.xaml', '.csproj', '.md', '.json', '.xml'].includes(ext)) {
          results.push({
            path: relPath,
            name: entry.name,
            content: fs.readFileSync(fullPath, 'utf8'),
          });
        }
      }
    }
    return results;
  }

  const files = scanDir(mauiDir);
  res.json({ files });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
