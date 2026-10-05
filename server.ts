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
  const { question, context, candidateProfile, answerStyle } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (!ai) {
    // Graceful fallback advice if GEMINI_API_KEY is not configured
    const fallbackAnswer = [
      "💡 Key Talking Points:\n",
      "• Direct Answer: Outline the core architecture and key trade-offs in 2-3 sentences.\n",
      "• STAR Method: State the Situation, Task, Action you took, and measurable Results.\n",
      "• Deepgram & .NET: Highlight 16kHz PCM streaming and WebSocket zero-latency pipeline.\n",
      "• Edge Cases: Mention error handling, thread safety, and resource cleanup.\n"
    ];

    for (const chunk of fallbackAnswer) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      await new Promise(r => setTimeout(r, 60));
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    return;
  }

  try {
    const role = candidateProfile?.role || 'Senior Backend Engineer';
    const skills = candidateProfile?.skills || '.NET, C#, Distributed Systems, WebSockets';
    const style = answerStyle || 'Natural';

    const systemPrompt = `You are an elite, discreet real-time AI Interview Copilot.
The user is participating in a high-stakes technical or behavioral interview.
Candidate Profile: Role: ${role}, Skills: ${skills}.
Answer Style: ${style}.

A question was just asked by the interviewer:
"${question}"

Conversation Context so far:
${context ? context.slice(-5).join('\n') : 'No prior context'}

TASK:
Provide brief, high-impact bulleted talking points that the user can glance at instantly and speak naturally.
Structure:
1. Quick Direct Hook (1 sentence)
2. 3-4 Key Talking Points (with concrete technical keywords, metrics, or STAR bullet)
3. 1 Pro Tip or Trade-off
Format with clean markdown bullets. Keep it concise (under 120 words total). Never ramble.`;

    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('Gemini copilot error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Generation error', done: true })}\n\n`);
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
