import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VISION_FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
];

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeGemini3Config(rawConfig: Record<string, any>): Record<string, any> {
  const cleaned = { ...rawConfig };
  delete cleaned.topP;
  delete cleaned.topK;
  delete cleaned.candidateCount;
  return cleaned;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is missing or not configured on the server. Please check the Settings > Secrets panel.'
    );
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

function parseGeminiJsonResponse(
  rawResponse: unknown,
  expectedKeys: string[] = []
): Record<string, any> {
  if (rawResponse === null || rawResponse === undefined) {
    throw new Error('Gemini Vision returned an empty response.');
  }

  let rawText = '';

  // 1. Extract raw text string from any wrapper object or direct object
  if (typeof rawResponse === 'string') {
    rawText = rawResponse;
  } else if (typeof rawResponse === 'object') {
    const obj = rawResponse as Record<string, any>;

    // Check if the object itself already has the expected keys directly
    if (
      expectedKeys.length > 0 &&
      expectedKeys.some((k) => obj[k] !== undefined && String(obj[k]).trim() !== '')
    ) {
      return obj;
    }

    // Check nested wrapper objects (.data, .result, .response)
    for (const wrapperKey of ['data', 'result', 'response', 'payload']) {
      const nested = obj[wrapperKey];
      if (nested && typeof nested === 'object') {
        if (
          expectedKeys.length === 0 ||
          expectedKeys.some((k) => nested[k] !== undefined && String(nested[k]).trim() !== '')
        ) {
          return nested as Record<string, any>;
        }
      }
      if (typeof nested === 'string' && nested.trim()) {
        rawText = nested;
        break;
      }
    }

    if (!rawText) {
      if (typeof obj.text === 'string' && obj.text.trim()) {
        rawText = obj.text;
      } else if (typeof obj.rawText === 'string' && obj.rawText.trim()) {
        rawText = obj.rawText;
      } else if (
         typeof obj?.candidates?.[0]?.content?.parts?.[0]?.text === 'string'
      ) {
        rawText = obj.candidates[0].content.parts[0].text;
      } else {
        rawText = JSON.stringify(obj);
      }
    }
  } else {
    rawText = String(rawResponse);
  }

  // 2. Strip markdown fences (```json ... ``` or ``` ... ```)
  const stripped = rawText
    .trim()
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();

  // 3. Extract the first valid { ... } block via regex and parse it
  const jsonBlockMatch = stripped.match(/\{[\s\S]*\}/);
  const candidateJson = jsonBlockMatch ? jsonBlockMatch[0] : stripped;

  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(candidateJson);
  } catch {
    throw new Error(
      `Unable to parse Gemini JSON response. Raw output: ${stripped.slice(0, 500) || '(empty)'}`
    );
  }

  // If the parsed object itself wraps .text / .data / .result, unwrap one more level
  for (const nestedKey of ['data', 'result', 'text', 'response']) {
    if (parsed && typeof parsed[nestedKey] === 'string' && parsed[nestedKey].includes('{')) {
      try {
        const innerMatch = parsed[nestedKey]
          .replace(/```(?:json)?/gi, '')
          .replace(/```/g, '')
          .match(/\{[\s\S]*\}/);
        if (innerMatch) {
          parsed = JSON.parse(innerMatch[0]);
        }
      } catch {
        // Keep outer parsed
      }
    } else if (
      parsed &&
      parsed[nestedKey] &&
      typeof parsed[nestedKey] === 'object' &&
      !Array.isArray(parsed[nestedKey])
    ) {
      parsed = parsed[nestedKey];
    }
  }

  // 4. Validate that the parsed object contains at least one expected key
  if (expectedKeys.length > 0) {
    const hasExpectedKey = expectedKeys.some(
      (key) => parsed && parsed[key] !== undefined && String(parsed[key]).trim() !== ''
    );
    if (!hasExpectedKey) {
      throw new Error(
        `Scan response missing expected fields (${expectedKeys.join(', ')}). Raw output: ${stripped.slice(0, 500)}`
      );
    }
  }

  return parsed;
}

function getOrderedCandidateModels(requestedModel?: string): string[] {
  const normalized =
    !requestedModel ||
    requestedModel.includes('gemini-2.5') ||
    requestedModel.includes('gemini-2.0') ||
    requestedModel.includes('gemini-1.5')
      ? 'gemini-3.5-flash-lite'
      : requestedModel;

  return Array.from(new Set([normalized, ...VISION_FALLBACK_MODELS]));
}

function isHighDemandOrUnavailableError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  const status = Number((err as any)?.status || (err as any)?.code || 0);
  return (
    status === 503 ||
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('temporarily unavailable')
  );
}

function isCascadeRetryableError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  const status = Number((err as any)?.status || (err as any)?.code || 0);
  return (
    isHighDemandOrUnavailableError(err) ||
    status === 429 ||
    status === 404 ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('404') ||
    msg.includes('not_found') ||
    msg.includes('not found') ||
    msg.includes('no longer available') ||
    msg.includes('is not supported')
  );
}

async function generateVisionContentWithFallback(
  ai: GoogleGenAI,
  requestedModel: string | undefined,
  base64Data: string,
  mimeType: string,
  prompt: string,
  responseSchema: Record<string, any>,
  singleAttempt = false
): Promise<GenerateContentResponse> {
  const fastOcrConfig = sanitizeGemini3Config({
    responseMimeType: 'application/json',
    responseSchema,
    temperature: 0.1,
    thinkingConfig: { thinkingBudget: 0 },
  });

  const callModel = async (modelName: string): Promise<GenerateContentResponse> => {
    const contentsPayload = {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          text: prompt,
        },
      ],
    };

    try {
      return await ai.models.generateContent({
        model: modelName,
        contents: contentsPayload,
        config: fastOcrConfig,
      });
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      // If a fallback model does not accept thinkingConfig, retry immediately without thinkingConfig
      if (msg.includes('thinking') || msg.includes('invalid_argument')) {
        const { thinkingConfig: _unused, ...fallbackConfig } = fastOcrConfig;
        return await ai.models.generateContent({
          model: modelName,
          contents: contentsPayload,
          config: fallbackConfig,
        });
      }
      throw err;
    }
  };

  if (singleAttempt && requestedModel) {
    return await callModel(requestedModel);
  }

  const candidates = getOrderedCandidateModels(requestedModel);
  let lastError: unknown;

  for (let i = 0; i < candidates.length; i++) {
    const modelName = candidates[i];
    try {
      return await callModel(modelName);
    } catch (err) {
      lastError = err;

      // For gemini-3.8-flash, if a 503 or UNAVAILABLE response is returned,
      // wait 1200ms and retry gemini-3.8-flash once before cascading down
      if (modelName === 'gemini-3.8-flash' && isHighDemandOrUnavailableError(err)) {
        await sleepMs(1200);
        try {
          return await callModel('gemini-3.8-flash');
        } catch (retryErr) {
          lastError = retryErr;
          if (!isCascadeRetryableError(retryErr)) {
            throw retryErr;
          }
        }
      } else if (!isCascadeRetryableError(err)) {
        throw err;
      }

      // Wait 800ms backoff before attempting the next model in the cascade
      if (i < candidates.length - 1) {
        await sleepMs(800);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('All candidate Gemini Vision models failed.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  app.post('/api/gemini/scan-id', async (req, res) => {
    try {
      const { base64Data, mimeType = 'image/jpeg', model, singleAttempt } = req.body || {};
      if (!base64Data || typeof base64Data !== 'string') {
        res.status(400).json({ error: 'Missing base64Data for ID document scan.' });
        return;
      }

      const ai = getGeminiClient();
      const prompt = `Analyze this identification card (Driver's License, State ID, Passport, or Badge). Extract all visible text and demographics and return strict JSON with these exact keys:
- fullName: Full name formatted as "First Middle Last" or "First Last" (convert from ALL CAPS to Title Case)
- idType: One of "Driver's License (DL)", "State ID Card", "Passport", "Military / Gov ID", or "Work / Facility Badge"
- idNumber: The license, document, or badge number string
- issuingState: 2-letter state or issuing authority code (e.g., "CO", "WA", "TX")
- approxAge: Calculate the person's approximate age or age bracket (e.g., "30-35" or exact age like "41") based on the Date of Birth (DOB) relative to the year 2026
- gender: Translate sex marker ("M" -> "Male", "F" -> "Female", "X" -> "Non-Binary / Other", or "Unknown")
- height: Format height cleanly (e.g., convert "5'-04\\"" or "504" to "5'4\\"" or "5'10\\"")
- weight: Format weight with lbs (e.g., "170 lbs")
- hairEyeColor: Expand standard ID abbreviations (e.g., "BRO" -> "Brown", "BLK" -> "Black", "BLN" -> "Blonde", "BLU" -> "Blue", "GRN" -> "Green", "HAZ" -> "Hazel") into a combined string like "Brown hair, Blue eyes"
- address: Full street and unit/apt address printed on the ID`;

      const response = await generateVisionContentWithFallback(
        ai,
        model,
        base64Data,
        mimeType,
        prompt,
        {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            idType: { type: Type.STRING },
            idNumber: { type: Type.STRING },
            issuingState: { type: Type.STRING },
            approxAge: { type: Type.STRING },
            gender: { type: Type.STRING },
            height: { type: Type.STRING },
            weight: { type: Type.STRING },
            hairEyeColor: { type: Type.STRING },
            address: { type: Type.STRING },
          },
          required: [
            'fullName',
            'idType',
            'idNumber',
            'issuingState',
            'approxAge',
            'gender',
            'height',
            'weight',
            'hairEyeColor',
            'address',
          ],
        },
        Boolean(singleAttempt)
      );

      const parsed = parseGeminiJsonResponse(response.text || response, ['idNumber', 'fullName']);

      const resultData = {
        fullName: String(parsed.fullName || parsed.name || '').trim(),
        idType: String(parsed.idType || parsed.documentType || "Driver's License (DL)").trim(),
        idNumber: String(parsed.idNumber || parsed.licenseNumber || parsed.dlNumber || '').trim(),
        issuingState: String(parsed.issuingState || parsed.state || '').trim().toUpperCase(),
        approxAge: String(parsed.approxAge || parsed.age || '').trim(),
        gender: String(parsed.gender || parsed.sex || 'Unknown').trim(),
        height: String(parsed.height || '').trim(),
        weight: String(parsed.weight || parsed.weightBuild || '').trim(),
        hairEyeColor: String(parsed.hairEyeColor || parsed.hairEyes || '').trim(),
        address: String(parsed.address || parsed.streetAddress || '').trim(),
      };

      res.json({
        ...resultData,
        data: resultData,
        result: resultData,
        rawText: response.text || JSON.stringify(resultData),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = isHighDemandOrUnavailableError(err)
        ? 503
        : isCascadeRetryableError(err)
        ? Number((err as any)?.status || 503)
        : 500;
      res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
    }
  });

  app.post('/api/gemini/scan-plate', async (req, res) => {
    try {
      const { base64Data, mimeType = 'image/jpeg', model, singleAttempt } = req.body || {};
      if (!base64Data || typeof base64Data !== 'string') {
        res.status(400).json({ error: 'Missing base64Data for vehicle/plate scan.' });
        return;
      }

      const ai = getGeminiClient();
      const prompt = `Analyze this vehicle image. Read the license plate characters, issuing state (if visible), vehicle color, make, model, and body style. Return strict JSON with these exact keys:
- plateNumber: Uppercase alphanumeric plate string (or "UNREADABLE" if no plate is visible)
- plateState: 2-letter state code if visible (or "")
- vehicleColor: Exterior color (e.g., "Silver", "Black", "White")
- vehicleMake: Manufacturer (e.g., "GMC", "Toyota", "Honda")
- vehicleModel: Model and body type (e.g., "Sierra Pickup", "Civic Sedan", "RAV4 SUV")
- formattedSummary: Combined string formatted as "{Color} {Make} {Model}, {State} #{Plate}" (e.g., "Black GMC Sierra, CO #ABC-123")`;

      const response = await generateVisionContentWithFallback(
        ai,
        model,
        base64Data,
        mimeType,
        prompt,
        {
          type: Type.OBJECT,
          properties: {
            plateNumber: { type: Type.STRING },
            plateState: { type: Type.STRING },
            vehicleColor: { type: Type.STRING },
            vehicleMake: { type: Type.STRING },
            vehicleModel: { type: Type.STRING },
            formattedSummary: { type: Type.STRING },
          },
          required: [
            'plateNumber',
            'plateState',
            'vehicleColor',
            'vehicleMake',
            'vehicleModel',
            'formattedSummary',
          ],
        },
        Boolean(singleAttempt)
      );

      const parsed = parseGeminiJsonResponse(response.text || response, [
        'plateNumber',
        'formattedSummary',
        'vehicleMake',
      ]);

      const plateNumber = String(parsed.plateNumber || parsed.plate || 'UNREADABLE')
        .trim()
        .toUpperCase();
      const plateState = String(parsed.plateState || parsed.state || '').trim().toUpperCase();
      const vehicleColor = String(parsed.vehicleColor || parsed.color || '').trim();
      const vehicleMake = String(parsed.vehicleMake || parsed.make || '').trim();
      const vehicleModel = String(parsed.vehicleModel || parsed.model || '').trim();

      const vehicleLabel =
        [vehicleColor, vehicleMake, vehicleModel].filter(Boolean).join(' ') || 'Vehicle';
      const plateLabel = plateState ? `${plateState} #${plateNumber}` : `#${plateNumber}`;
      const formattedSummary =
        String(parsed.formattedSummary || '').trim() || `${vehicleLabel}, ${plateLabel}`;

      const resultData = {
        plateNumber,
        plateState,
        vehicleColor,
        vehicleMake,
        vehicleModel,
        formattedSummary,
      };

      res.json({
        ...resultData,
        data: resultData,
        result: resultData,
        rawText: response.text || JSON.stringify(resultData),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = isHighDemandOrUnavailableError(err)
        ? 503
        : isCascadeRetryableError(err)
        ? Number((err as any)?.status || 503)
        : 500;
      res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
