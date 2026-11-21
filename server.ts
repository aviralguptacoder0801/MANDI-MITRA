import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildGeminiAttemptPlan,
  isRetryableGeminiError,
  normalizeChatForGemini,
  type GeminiAttempt,
  type GroundingToolChoice,
} from './src/utils/chatHistory.ts';
import {
  extractGroundingSources,
  selectGroundingTool,
  type GroundingMode,
} from './src/utils/grounding.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildToolConfig(
  attempt: GeminiAttempt,
  latLng: { latitude: number; longitude: number }
): Record<string, unknown> {
  const cfg: Record<string, unknown> = {};
  if (attempt.model === 'gemini-4-hydrogen') {
    cfg.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  }
  if (attempt.tool === 'maps') {
    cfg.tools = [{ googleMaps: {} }];
    cfg.toolConfig = {
      retrievalConfig: {
        latLng,
      },
    };
  } else if (attempt.tool === 'search') {
    cfg.tools = [{ googleSearch: {} }];
  }
  return cfg;
}

const QUOTA_COOLDOWN_MS = 5 * 60 * 1000;
const quotaCooldownUntil = new Map<string, number>();

function attemptKey(attempt: GeminiAttempt): string {
  return `${attempt.model}:${attempt.tool}`;
}

function isQuotaError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED');
}

async function runGeminiAttemptPlan<T>(
  preferredTool: GroundingToolChoice,
  executor: (attempt: GeminiAttempt) => Promise<T>
): Promise<{ result: T; attempt: GeminiAttempt }> {
  const fullPlan = buildGeminiAttemptPlan(preferredTool);
  const now = Date.now();

  // Prioritize attempts that are not currently in a 429 quota cooldown window
  const freshAttempts = fullPlan.filter((a) => (quotaCooldownUntil.get(attemptKey(a)) ?? 0) <= now);
  const cooledAttempts = fullPlan.filter((a) => (quotaCooldownUntil.get(attemptKey(a)) ?? 0) > now);
  const orderedPlan = [...freshAttempts, ...cooledAttempts];

  let lastError: unknown = null;

  for (let i = 0; i < orderedPlan.length; i++) {
    const attempt = orderedPlan[i];
    try {
      const result = await executor(attempt);
      quotaCooldownUntil.delete(attemptKey(attempt));
      return { result, attempt };
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      if (isQuotaError(err)) {
        quotaCooldownUntil.set(attemptKey(attempt), Date.now() + QUOTA_COOLDOWN_MS);
      }
      console.error(
        `[MandiMitra Gemini] Attempt ${i + 1}/${orderedPlan.length} (${attempt.model}, tool=${attempt.tool}) failed:`,
        errMsg.slice(0, 260)
      );
      if (!isRetryableGeminiError(err) || i === orderedPlan.length - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  throw lastError ?? new Error('AI request failed.');
}

function getErrorStatus(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY')) {
    return {
      status: 503,
      message: 'AI assistant is unavailable: Gemini API key is not configured in Settings > Secrets.',
    };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403')) {
    return {
      status: 403,
      message: 'Gemini API key was rejected. Please verify your key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Gemini API quota limit reached right now. Please wait a minute and tap Retry, or select a billing-enabled key in Settings > Secrets.',
    };
  }
  return {
    status: 500,
    message: `AI request failed: ${raw.slice(0, 200)}`,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'mandimitra-api' });
  });

  // Google Maps Platform browser key lookup (reads env/secret without hardcoding)
  app.get('/api/maps-config', (_req, res) => {
    const rawKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '';
    const apiKey = rawKey && rawKey !== 'MY_GOOGLE_MAPS_API_KEY' ? rawKey : '';
    res.json({ apiKey });
  });

  // 1. Regional WhatsApp / Voice Mandi Advisory with Google Search & Google Maps Grounding
  app.post('/api/advisory', async (req, res) => {
    try {
      const {
        query,
        language = 'hi',
        context,
        groundingMode = 'auto',
        latLng,
      } = req.body ?? {};
      if (!query || typeof query !== 'string' || !query.trim()) {
        res.status(400).json({ error: 'Please provide a farmer query.' });
        return;
      }

      const ai = getGeminiClient();
      const langInstruction: Record<string, string> = {
        hi: 'Respond in warm, simple, clear Hindi (Devanagari script) that a Uttar Pradesh farmer easily understands. Keep numbers in standard digits (₹1,450).',
        awadhi: 'Respond in warm, respectful Awadhi dialect (written in Devanagari script, e.g., "भैया", "तोहार", "बा", "होई") spoken around Lucknow, Barabanki, Ayodhya, and Prayagraj. Keep numbers in standard digits.',
        bhojpuri: 'Respond in warm, respectful Bhojpuri dialect (written in Devanagari script, e.g., "किसान भाई", "राउर", "बाटे", "मिली") spoken around Varanasi, Gorakhpur, and Eastern UP. Keep numbers in standard digits.',
        en: 'Respond in clear, concise, practical English tailored for an Uttar Pradesh farmer.',
      };

      const selectedTool = selectGroundingTool(query.trim(), groundingMode as GroundingMode);
      const validLat = typeof latLng?.latitude === 'number' ? latLng.latitude : 26.8467;
      const validLng = typeof latLng?.longitude === 'number' ? latLng.longitude : 80.9462;

      const systemInstruction = `You are MandiMitra (मंडीमित्र), a practical market price intelligence and mandi advisor for Uttar Pradesh farmers.
${langInstruction[language] || langInstruction.hi}

Rules:
- Use the live farmer context provided below AND live grounded ${selectedTool === 'maps' ? 'Google Maps place/route data' : 'Google Search market/MSP/weather updates'} when available.
- Give a direct, super-simple recommendation in 4-6 short lines suitable for WhatsApp or IVR voice readout:
  1. Direct verdict (Sell today or Store X days, and which specific mandi gives the highest net take-home profit).
  2. Exact net take-home profit after transport & commission vs local mandi, noting the farmer's crop grade.
  3. Any relevant congestion alert, nearby place/route detail, or latest scheme update.
- Avoid markdown tables or heavy jargon so it reads cleanly and sounds natural on voice IVR.`;

      const prompt = `Farmer question: "${query.trim()}"

Live Mandi & Farm Context (JSON):
${JSON.stringify(context ?? {}, null, 2)}`;

      const { result: response, attempt } = await runGeminiAttemptPlan(
        selectedTool,
        async (attemptItem) => {
          const r = await ai.models.generateContent({
            model: attemptItem.model,
            contents: prompt,
            config: {
              systemInstruction,
              ...buildToolConfig(attemptItem, { latitude: validLat, longitude: validLng }),
            },
          });
          if (!(r.text ?? '').trim()) {
            throw new Error('EMPTY_RESPONSE');
          }
          return r;
        }
      );

      const reply = (response.text ?? '').trim();
      const sources = extractGroundingSources(
        response.candidates?.[0]?.groundingMetadata?.groundingChunks
      );

      res.json({
        reply,
        language,
        groundingUsed: attempt.tool,
        modelUsed: attempt.model,
        sources,
      });
    } catch (err) {
      const { status, message } = getErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  // 2. IVR Text-to-Speech (gemini-3.8-flash-lite-tts -> WAV base64)
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, language = 'hi' } = req.body ?? {};
      if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'Text is required for audio synthesis.' });
        return;
      }

      const ai = getGeminiClient();
      const styleMap: Record<string, string> = {
        hi: 'Warm, clear, trustworthy Indian rural agricultural advisor speaking Hindi at a steady, easy-to-follow pace',
        awadhi: 'Warm, friendly Uttar Pradesh rural advisor speaking Awadhi clearly and reassuringly',
        bhojpuri: 'Warm, friendly Eastern UP rural advisor speaking Bhojpuri clearly and reassuringly',
        en: 'Clear, friendly Indian agricultural advisor speaking simple English at a steady pace',
      };

      const trimmedText = text.trim().slice(0, 1200);
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: trimmedText,
                speechMetadata: {
                  style: styleMap[language] || styleMap.hi,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({ error: 'No audio was returned by the voice service.' });
        return;
      }

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
    } catch (err) {
      const { status, message } = getErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  // 3. Audio Voice Note Transcription (gemini-3.5-transcribe)
  app.post('/api/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType = 'audio/webm', language = 'hi' } = req.body ?? {};
      if (!audioBase64 || typeof audioBase64 !== 'string') {
        res.status(400).json({ error: 'Audio data is required.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: `Transcribe this Uttar Pradesh farmer's voice note accurately. Preferred script/language hint: ${language}. Return only the spoken transcript.`,
            },
          ],
        },
      });

      const transcript = (response.text ?? '').trim();
      res.json({ transcript });
    } catch (err) {
      const { status, message } = getErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  // 4. Multimodal Crop Photo Quality Grading (gemini-4-hydrogen vision + structured JSON)
  app.post('/api/grade-photo', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', cropName = 'Potato (Aloo)' } = req.body ?? {};
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'Crop image is required for quality inspection.' });
        return;
      }

      const ai = getGeminiClient();
      const { result: response } = await runGeminiAttemptPlan('none', async (attemptItem) => {
        const r = await ai.models.generateContent({
          model: attemptItem.model,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
              {
                text: `Inspect this photograph of ${cropName} from an Uttar Pradesh mandi lot as an AGMARK agricultural quality grader.
Estimate realistic mandi gate quality metrics:
- moisturePercent (realistic percentage for this crop)
- damagePercent (visible cuts, sprouting, shriveling, bruising, or discoloration %)
- foreignMatterPercent (soil, chaff, stones %)
- sizeGrade ("bold", "medium", or "small")
- gradeTier ("premium", "faq", or "commercial")
- visualSummary (2 concise sentences noting skin/grain luster, uniformity, and any defects so the farmer can negotiate fairly at the mandi gate)
- negotiationTip (1 practical sentence telling the farmer how to defend this grade against middlemen deductions).`,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            ...(attemptItem.model === 'gemini-4-hydrogen'
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
              : {}),
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                moisturePercent: { type: Type.NUMBER },
                damagePercent: { type: Type.NUMBER },
                foreignMatterPercent: { type: Type.NUMBER },
                sizeGrade: { type: Type.STRING },
                gradeTier: { type: Type.STRING },
                visualSummary: { type: Type.STRING },
                negotiationTip: { type: Type.STRING },
              },
              required: [
                'moisturePercent',
                'damagePercent',
                'foreignMatterPercent',
                'sizeGrade',
                'gradeTier',
                'visualSummary',
                'negotiationTip',
              ],
            },
          },
        });
        if (!(r.text ?? '').trim()) {
          throw new Error('EMPTY_RESPONSE');
        }
        return r;
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err) {
      const { status, message } = getErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  // 5. Floating Multi-Turn Gemini Chatbot (Google Search & Google Maps Grounding via ai.chats)
  app.post('/api/chat', async (req, res) => {
    try {
      const {
        messages,
        language = 'hi',
        context,
        groundingMode = 'auto',
        latLng,
      } = req.body ?? {};
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Chat messages are required.' });
        return;
      }

      const ai = getGeminiClient();
      const chatLangDefault: Record<string, string> = {
        hi: 'simple clear Hindi (Devanagari)',
        awadhi: 'warm Uttar Pradesh Awadhi (Devanagari)',
        bhojpuri: 'warm Eastern UP Bhojpuri (Devanagari)',
        en: 'clear simple English',
      };

      const { history: normalizedHistory, latestUserMessage } = normalizeChatForGemini(
        messages,
        12
      );
      if (!latestUserMessage) {
        res.status(400).json({ error: 'Latest chat message cannot be empty.' });
        return;
      }

      const selectedTool = selectGroundingTool(latestUserMessage, groundingMode as GroundingMode);
      const validLat = typeof latLng?.latitude === 'number' ? latLng.latitude : 26.8467;
      const validLng = typeof latLng?.longitude === 'number' ? latLng.longitude : 80.9462;

      const systemInstruction = `You are MandiMitra AI Assistant, a friendly, super-simple help & agronomy chatbot embedded in the MandiMitra Uttar Pradesh farmer market intelligence app.
You help farmers with:
1. Explaining their Net Profit Calculator results, crop quality adjustments, and why one mandi beats another.
2. Live up-to-date UP market news, weather alerts, and UP Government MSP / e-Kharid scheme rules (using Google Search grounding when available).
3. Real nearby mandis, cold storages, Krishi Vigyan Kendras, weighbridges, and driving directions (using Google Maps grounding when available).

Language guidance: Match the language the user writes in (Hindi, Awadhi, Bhojpuri, Hinglish, or English). Default to ${chatLangDefault[language] || chatLangDefault.hi} if ambiguous.
Keep answers very simple, friendly, and concise (3-6 short lines or numbered steps), grounded in the user's live farm state below:
${JSON.stringify(context ?? {}, null, 2)}`;

      const { result: response, attempt } = await runGeminiAttemptPlan(
        selectedTool,
        async (attemptItem) => {
          const chat = ai.chats.create({
            model: attemptItem.model,
            history: normalizedHistory,
            config: {
              systemInstruction,
              ...buildToolConfig(attemptItem, { latitude: validLat, longitude: validLng }),
            },
          });
          const r = await chat.sendMessage({ message: latestUserMessage });
          if (!(r.text ?? '').trim()) {
            throw new Error('EMPTY_RESPONSE');
          }
          return r;
        }
      );

      const reply = (response.text ?? '').trim();
      const sources = extractGroundingSources(
        response.candidates?.[0]?.groundingMetadata?.groundingChunks
      );

      res.json({
        reply,
        groundingUsed: attempt.tool,
        modelUsed: attempt.model,
        sources,
      });
    } catch (err) {
      const { status, message } = getErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  // 6. One-Tap Live Market News (Google Search) & Nearby Agri Places (Google Maps Grounding)
  app.post('/api/live-intel', async (req, res) => {
    try {
      const {
        mode = 'search',
        cropName = 'Potato (Aloo)',
        districtName = 'Barabanki',
        language = 'hi',
        latLng,
      } = req.body ?? {};

      const ai = getGeminiClient();
      const langLabel =
        language === 'en'
          ? 'simple English'
          : language === 'bhojpuri'
            ? 'simple Bhojpuri (Devanagari)'
            : language === 'awadhi'
              ? 'simple Awadhi (Devanagari)'
              : 'simple Hindi (Devanagari)';

      const validLat = typeof latLng?.latitude === 'number' ? latLng.latitude : 26.8467;
      const validLng = typeof latLng?.longitude === 'number' ? latLng.longitude : 80.9462;

      const useMaps = mode === 'maps';
      const prompt = useMaps
        ? `Find real, verified APMC vegetable/grain mandis and cold storage facilities near ${districtName}, Uttar Pradesh suitable for selling or storing ${cropName}. Give 3-4 short, easy-to-read bullet points in ${langLabel} with exact place names and practical tips.`
        : `Give a short, easy-to-read 3-4 bullet briefing in ${langLabel} for a farmer in ${districtName}, Uttar Pradesh growing ${cropName}: latest UP mandi market trend or MSP news, and current weather/storage precaution.`;

      const { result: response, attempt } = await runGeminiAttemptPlan(
        useMaps ? 'maps' : 'search',
        async (attemptItem) => {
          const r = await ai.models.generateContent({
            model: attemptItem.model,
            contents: prompt,
            config: buildToolConfig(attemptItem, { latitude: validLat, longitude: validLng }),
          });
          if (!(r.text ?? '').trim()) {
            throw new Error('EMPTY_RESPONSE');
          }
          return r;
        }
      );

      const summary = (response.text ?? '').trim();
      const sources = extractGroundingSources(
        response.candidates?.[0]?.groundingMetadata?.groundingChunks
      );

      res.json({
        summary,
        groundingUsed: attempt.tool,
        modelUsed: attempt.model,
        sources,
      });
    } catch (err) {
      const { status, message } = getErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MandiMitra server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
