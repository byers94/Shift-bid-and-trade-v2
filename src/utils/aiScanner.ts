export interface ScannedIdDocumentResult {
  fullName: string;
  idType: string;
  idNumber: string;
  issuingState: string;
  approxAge: string;
  gender: string;
  height: string;
  weight: string;
  hairEyeColor: string;
  address: string;
  isSimulated?: boolean;
  sampleImageDataUrl?: string;
}

export interface ScannedVehiclePlateResult {
  plateNumber: string;
  plateState: string;
  vehicleColor: string;
  vehicleMake: string;
  vehicleModel: string;
  formattedSummary: string;
  isSimulated?: boolean;
  sampleImageDataUrl?: string;
}

const SAMPLE_ID_SCANS: ScannedIdDocumentResult[] = [
  {
    fullName: 'Marcus J. Reynolds',
    idType: "Driver's License (DL)",
    idNumber: 'WDL-9482-019B',
    issuingState: 'WA',
    approxAge: '34',
    gender: 'Male',
    height: '5\'11"',
    weight: '185 lbs',
    hairEyeColor: 'Brown hair, Hazel eyes',
    address: 'Apt #402 / Bldg 3'
  },
  {
    fullName: 'Elena M. Vance',
    idType: "Driver's License (DL)",
    idNumber: 'WDL-7731-402C',
    issuingState: 'WA',
    approxAge: '29',
    gender: 'Female',
    height: '5\'6"',
    weight: '135 lbs',
    hairEyeColor: 'Black hair, Brown eyes',
    address: 'Apt 304'
  },
  {
    fullName: 'Devon R. Holloway',
    idType: 'State ID Card',
    idNumber: 'CO-ID-884-9201',
    issuingState: 'CO',
    approxAge: '41',
    gender: 'Male',
    height: '6\'1"',
    weight: '210 lbs',
    hairEyeColor: 'Brown hair, Blue eyes',
    address: 'Unit 412'
  }
];

const SAMPLE_VEHICLE_SCANS: ScannedVehiclePlateResult[] = [
  {
    plateNumber: 'ABC-123',
    plateState: 'WA',
    vehicleColor: 'Silver',
    vehicleMake: 'Honda',
    vehicleModel: 'Accord Sedan',
    formattedSummary: 'Silver Honda Accord Sedan, WA #ABC-123'
  },
  {
    plateNumber: 'WA-8849B',
    plateState: 'WA',
    vehicleColor: 'Black',
    vehicleMake: 'Ford',
    vehicleModel: 'F-150 Pickup',
    formattedSummary: 'Black Ford F-150 Pickup, WA #WA-8849B'
  },
  {
    plateNumber: 'ABC-1234',
    plateState: 'CO',
    vehicleColor: 'Silver',
    vehicleMake: 'Honda',
    vehicleModel: 'Civic Sedan',
    formattedSummary: 'Silver Honda Civic Sedan, CO #ABC-1234'
  }
];

let sampleIdCursor = 0;
let samplePlateCursor = 0;

export function calculateAgeFromDobString(dobRaw?: string): string {
  if (!dobRaw) return '';
  const parsed = new Date(dobRaw);
  if (Number.isNaN(parsed.getTime())) return '';
  const referenceYear = 2026;
  let age = referenceYear - parsed.getFullYear();
  const today = new Date();
  const m = today.getMonth() - parsed.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < parsed.getDate())) {
    age--;
  }
  return age > 0 && age < 120 ? String(age) : '';
}

export function generateSimulatedIdCardImage(scan: ScannedIdDocumentResult): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="800" height="500" rx="24" fill="url(#bg)" stroke="#38bdf8" stroke-width="4"/>
    <rect x="24" y="24" width="752" height="64" rx="12" fill="#0284c7"/>
    <text x="48" y="65" fill="#ffffff" font-family="monospace" font-size="26" font-weight="bold">
      ${scan.issuingState || 'WA'} DRIVER LICENSE • SIMULATED SAMPLE
    </text>
    <rect x="44" y="116" width="190" height="240" rx="14" fill="#334155" stroke="#64748b" stroke-width="2"/>
    <circle cx="139" cy="195" r="42" fill="#94a3b8"/>
    <path d="M75 315 C75 255 203 255 203 315 Z" fill="#94a3b8"/>
    <text x="268" y="145" fill="#38bdf8" font-family="monospace" font-size="18" font-weight="bold">
      DL NO: ${scan.idNumber}
    </text>
    <text x="268" y="190" fill="#f8fafc" font-family="sans-serif" font-size="28" font-weight="bold">
      ${scan.fullName}
    </text>
    <text x="268" y="230" fill="#cbd5e1" font-family="sans-serif" font-size="20">
      ADDR: ${scan.address}
    </text>
    <text x="268" y="275" fill="#94a3b8" font-family="monospace" font-size="18">
      AGE: ~${scan.approxAge}   SEX: ${scan.gender.toUpperCase()}   HGT: ${scan.height}
    </text>
    <text x="268" y="312" fill="#94a3b8" font-family="monospace" font-size="18">
      WGT: ${scan.weight}   HAIR/EYES: ${scan.hairEyeColor}
    </text>
    <rect x="44" y="395" width="712" height="68" rx="10" fill="#090d16" stroke="#1e293b"/>
    <text x="64" y="436" fill="#22c55e" font-family="monospace" font-size="17">
      [SIMULATED TEST SAMPLE] • TIMESTAMP ${new Date().toISOString().slice(0, 19)}Z
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateSimulatedPlateImage(scan: ScannedVehiclePlateResult): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <rect width="800" height="500" fill="#090d16"/>
    <rect x="40" y="40" width="720" height="330" rx="20" fill="#1e293b" stroke="#475569" stroke-width="3"/>
    <text x="70" y="95" fill="#94a3b8" font-family="sans-serif" font-size="22" font-weight="bold">
      VEHICLE: ${scan.formattedSummary}
    </text>
    <rect x="190" y="130" width="420" height="190" rx="18" fill="#f8fafc" stroke="#f59e0b" stroke-width="6"/>
    <text x="400" y="172" text-anchor="middle" fill="#1e3a8a" font-family="sans-serif" font-size="24" font-weight="bold">
      ${scan.plateState || 'WA'} • SIMULATED SAMPLE
    </text>
    <text x="400" y="258" text-anchor="middle" fill="#0f172a" font-family="monospace" font-size="68" font-weight="bold" letter-spacing="4">
      ${scan.plateNumber}
    </text>
    <rect x="40" y="395" width="720" height="68" rx="10" fill="#0f172a" stroke="#f59e0b" stroke-width="2"/>
    <text x="64" y="436" fill="#fbbf24" font-family="monospace" font-size="17" font-weight="bold">
      [SIMULATED ALPR SAMPLE] PLATE #${scan.plateNumber} (${scan.plateState}) • ${scan.vehicleColor.toUpperCase()} ${scan.vehicleMake.toUpperCase()} ${scan.vehicleModel.toUpperCase()}
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getSampleIdScanResult(): ScannedIdDocumentResult {
  const base = SAMPLE_ID_SCANS[sampleIdCursor % SAMPLE_ID_SCANS.length];
  sampleIdCursor += 1;
  return {
    ...base,
    isSimulated: true,
    sampleImageDataUrl: generateSimulatedIdCardImage(base)
  };
}

export function getSampleVehiclePlateScanResult(): ScannedVehiclePlateResult {
  const base = SAMPLE_VEHICLE_SCANS[samplePlateCursor % SAMPLE_VEHICLE_SCANS.length];
  samplePlateCursor += 1;
  return {
    ...base,
    isSimulated: true,
    sampleImageDataUrl: generateSimulatedPlateImage(base)
  };
}

/**
 * Shared client-side image compression & base64 stripping for both scanners:
 * 1. Loads the File into an HTML Image object.
 * 2. Draws it onto an offscreen <canvas> scaled down so the max width or height is 1200px
 *    (preserving aspect ratio so small text on IDs and license plates remains crisp).
 * 3. Exports canvas.toDataURL('image/jpeg', 0.88).
 * 4. Strips the "data:image/jpeg;base64," prefix via .split(',')[1] and returns the raw
 *    base64Data and mimeType: 'image/jpeg'.
 */
export async function prepareImageForGemini(
  file: File
): Promise<{ base64Data: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);

        const MAX_DIMENSION = 1200;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          reject(new Error('Selected image file has invalid dimensions.'));
          return;
        }

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width >= height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create 2D canvas context for image compression.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const base64Data = dataUrl.split(',')[1] || '';

        if (!base64Data) {
          reject(new Error('Failed to extract base64 JPEG data from canvas.'));
          return;
        }

        resolve({
          base64Data,
          mimeType: 'image/jpeg',
          dataUrl
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Unable to decode image file "${file.name}".`));
    };

    img.src = objectUrl;
  });
}

export const GEMINI_VISION_CASCADE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-flash-latest'
] as const;

export const HIGH_DEMAND_RETRY_STATUS_TEXT =
  '⏳ High server demand — retrying scan via backup channel...';

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stripLegacyGeminiSamplingParams<T extends Record<string, any>>(config: T): T {
  const sanitized = { ...config };
  delete sanitized.temperature;
  delete sanitized.topP;
  delete sanitized.topK;
  delete sanitized.candidateCount;
  return sanitized;
}

function isHighDemand503Error(status: number, errorMessage: string): boolean {
  const msg = (errorMessage || '').toLowerCase();
  return (
    status === 503 ||
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('temporarily unavailable')
  );
}

function isRetryableModelCascadeError(status: number, errorMessage: string): boolean {
  const msg = (errorMessage || '').toLowerCase();
  return (
    isHighDemand503Error(status, errorMessage) ||
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

/**
 * Universal Server-to-Client JSON Unwrapping Helper:
 * 1. Extracts raw text strings or nested objects from any wrapper (.text, .data, .result, .response, .payload, candidates).
 * 2. Strips markdown fences (```json / ```).
 * 3. Extracts the first valid { ... } block via regex and parses it.
 * 4. Validates that the parsed object contains at least one expected key with a non-empty value,
 *    falling back gracefully to throw an error containing the raw text so it displays in the error banner
 *    instead of outputting "Identified Subject (#N/A)" or blank fields.
 */
export function parseGeminiJsonResponse(
  rawResponse: unknown,
  expectedKeys: string[] = []
): Record<string, any> {
  if (rawResponse === null || rawResponse === undefined) {
    throw new Error('Gemini Vision returned an empty response.');
  }

  const pickNonEmptyExpected = (obj: Record<string, any>): boolean => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    if (expectedKeys.length === 0) return Object.keys(obj).length > 0;
    return expectedKeys.some((k) => {
      const val = obj[k];
      return val !== undefined && val !== null && String(val).trim() !== '';
    });
  };

  let rawText = '';
  let candidateObject: Record<string, any> | null = null;

  // Step 1: Extract raw text string or unwrapped object from any wrapper shape
  if (typeof rawResponse === 'string') {
    rawText = rawResponse;
  } else if (typeof rawResponse === 'object') {
    const obj = rawResponse as Record<string, any>;

    if (pickNonEmptyExpected(obj)) {
      candidateObject = obj;
    } else {
      for (const wrapperKey of ['data', 'result', 'response', 'payload']) {
        const nested = obj[wrapperKey];
        if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
          if (pickNonEmptyExpected(nested as Record<string, any>)) {
            candidateObject = nested as Record<string, any>;
            break;
          }
        } else if (typeof nested === 'string' && nested.trim()) {
          rawText = nested;
          break;
        }
      }

      if (!candidateObject && !rawText) {
        if (typeof obj.text === 'string' && obj.text.trim()) {
          rawText = obj.text;
        } else if (typeof obj.rawText === 'string' && obj.rawText.trim()) {
          rawText = obj.rawText;
        } else if (typeof obj?.candidates?.[0]?.content?.parts?.[0]?.text === 'string') {
          rawText = obj.candidates[0].content.parts[0].text;
        } else if (typeof obj.message === 'string' && obj.message.trim()) {
          rawText = obj.message;
        } else {
          rawText = JSON.stringify(obj);
        }
      }
    }
  } else {
    rawText = String(rawResponse);
  }

  let parsed: Record<string, any> | null = candidateObject;

  if (!parsed) {
    // Step 2: Strip markdown fences (```json / ```)
    const stripped = rawText
      .trim()
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .trim();

    // Step 3: Extract the first valid { ... } block via regex and parse it
    const firstBraceBlock = stripped.match(/\{[\s\S]*\}/);
    const jsonCandidate = firstBraceBlock ? firstBraceBlock[0] : stripped;

    try {
      parsed = JSON.parse(jsonCandidate);
    } catch {
      throw new Error(
        `Could not parse Gemini scan JSON. Raw response: ${stripped.slice(0, 400) || '(empty)'}`
      );
    }

    // Unwrap if the parsed JSON still wraps .text / .data / .result
    for (const key of ['data', 'result', 'text', 'response', 'payload']) {
      const inner = parsed?.[key];
      if (typeof inner === 'string' && inner.includes('{')) {
        try {
          const innerCleaned = inner.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
          const innerBlock = innerCleaned.match(/\{[\s\S]*\}/);
          if (innerBlock) {
            parsed = JSON.parse(innerBlock[0]);
          }
        } catch {
          // Keep current parsed object
        }
      } else if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
        if (pickNonEmptyExpected(inner)) {
          parsed = inner;
          break;
        }
      }
    }
  }

  // Step 4: Validate that the parsed object contains at least one expected key
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      `Invalid scan object returned by server. Raw response: ${rawText.slice(0, 400) || '(empty)'}`
    );
  }

  if (expectedKeys.length > 0 && !pickNonEmptyExpected(parsed)) {
    const rawFallback =
      rawText ||
      (typeof (rawResponse as any)?.rawText === 'string'
        ? (rawResponse as any).rawText
        : JSON.stringify(parsed));
    throw new Error(
      `Scan did not return required fields (${expectedKeys.join(' / ')}). Raw response: ${String(rawFallback).slice(0, 400)}`
    );
  }

  return parsed;
}

async function callGeminiScanWithCascade(
  endpoint: '/api/gemini/scan-id' | '/api/gemini/scan-plate',
  base64Data: string,
  mimeType: string,
  onStatusUpdate?: (statusText: string) => void
): Promise<unknown> {
  let lastErrorMessage = 'Server error during Gemini Vision scan.';

  const attemptModelCall = async (
    modelName: string
  ): Promise<{ ok: boolean; status: number; payload: any }> => {
    const cleanBody = stripLegacyGeminiSamplingParams({
      model: modelName,
      base64Data,
      mimeType,
      singleAttempt: true
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanBody)
    });

    const rawBodyText = await response.text().catch(() => '');
    let payload: any = {};
    if (rawBodyText) {
      try {
        payload = JSON.parse(rawBodyText);
      } catch {
        payload = { text: rawBodyText };
      }
    }
    return { ok: response.ok, status: response.status, payload };
  };

  for (let i = 0; i < GEMINI_VISION_CASCADE_MODELS.length; i++) {
    const modelName = GEMINI_VISION_CASCADE_MODELS[i];
    const result = await attemptModelCall(modelName);

    if (result.ok) {
      return result.payload;
    }

    const errMsg = String(
      result.payload?.error ||
        result.payload?.text ||
        `Server error (${result.status}) during scan.`
    );
    lastErrorMessage = errMsg;

    // For gemini-3.8-flash, if a 503 or UNAVAILABLE response is returned,
    // wait 1200ms and retry gemini-3.8-flash once before immediately cascading down
    if (modelName === 'gemini-3.8-flash' && isHighDemand503Error(result.status, errMsg)) {
      onStatusUpdate?.(HIGH_DEMAND_RETRY_STATUS_TEXT);
      await sleepMs(1200);

      const retryResult = await attemptModelCall('gemini-3.8-flash');
      if (retryResult.ok) {
        return retryResult.payload;
      }

      const retryErrMsg = String(
        retryResult.payload?.error ||
          retryResult.payload?.text ||
          `Server error (${retryResult.status}) during scan.`
      );
      lastErrorMessage = retryErrMsg;

      if (!isRetryableModelCascadeError(retryResult.status, retryErrMsg)) {
        throw new Error(retryErrMsg);
      }
    } else if (!isRetryableModelCascadeError(result.status, errMsg)) {
      throw new Error(errMsg);
    }

    // Cascade down through gemini-3.5-flash-lite, gemini-3.7-flash, and gemini-flash-latest with 800ms backoff
    if (i < GEMINI_VISION_CASCADE_MODELS.length - 1) {
      onStatusUpdate?.(HIGH_DEMAND_RETRY_STATUS_TEXT);
      await sleepMs(800);
    }
  }

  throw new Error(lastErrorMessage);
}

/**
 * Live Gemini Vision Call #1 — scanIdentificationDocument(file: File)
 * Compresses the user's photo on the client, calls the server-side Gemini Vision
 * endpoint (/api/gemini/scan-id) with automatic 503/429/404 multi-model retry cascade,
 * and unwraps the JSON payload via parseGeminiJsonResponse.
 */
export async function scanIdentificationDocument(
  file: File,
  onStatusUpdate?: (statusText: string) => void
): Promise<ScannedIdDocumentResult> {
  const { base64Data, mimeType, dataUrl } = await prepareImageForGemini(file);

  const rawPayload = await callGeminiScanWithCascade(
    '/api/gemini/scan-id',
    base64Data,
    mimeType,
    onStatusUpdate
  );

  const parsed = parseGeminiJsonResponse(rawPayload, [
    'idNumber',
    'fullName',
    'name',
    'licenseNumber',
    'dlNumber'
  ]);

  const fullName = String(
    parsed.fullName || parsed.name || parsed.full_name || ''
  ).trim();
  const idType = String(
    parsed.idType || parsed.id_type || parsed.documentType || "Driver's License (DL)"
  ).trim();
  const idNumber = String(
    parsed.idNumber || parsed.id_number || parsed.licenseNumber || parsed.dlNumber || ''
  ).trim();
  const issuingState = String(
    parsed.issuingState || parsed.issuing_state || parsed.state || ''
  )
    .trim()
    .toUpperCase();
  const approxAge = String(
    parsed.approxAge ||
      parsed.approx_age ||
      parsed.age ||
      calculateAgeFromDobString(parsed.dob || parsed.dateOfBirth) ||
      ''
  ).trim();
  const gender = String(parsed.gender || parsed.sex || 'Unknown').trim();
  const height = String(parsed.height || '').trim();
  const weight = String(parsed.weight || parsed.weightBuild || parsed.weight_build || '').trim();
  const hairEyeColor = String(
    parsed.hairEyeColor || parsed.hair_eye_color || parsed.hairEyes || ''
  ).trim();
  const address = String(
    parsed.address || parsed.streetAddress || parsed.unitAddress || ''
  ).trim();

  if (!fullName && !idNumber) {
    throw new Error(
      `ID Scan could not extract a readable Name or ID Number from the image. Raw response: ${JSON.stringify(parsed).slice(0, 300)}`
    );
  }

  return {
    fullName,
    idType,
    idNumber,
    issuingState,
    approxAge,
    gender,
    height,
    weight,
    hairEyeColor,
    address,
    isSimulated: false,
    sampleImageDataUrl: dataUrl
  };
}

/**
 * Live Gemini Vision Call #2 — scanVehicleAndPlate(file: File)
 * Compresses the user's photo on the client, calls the server-side Gemini Vision
 * endpoint (/api/gemini/scan-plate) with automatic 503/429/404 multi-model retry cascade,
 * and unwraps the JSON payload via parseGeminiJsonResponse.
 */
export async function scanVehicleAndPlate(
  file: File,
  onStatusUpdate?: (statusText: string) => void
): Promise<ScannedVehiclePlateResult> {
  const { base64Data, mimeType, dataUrl } = await prepareImageForGemini(file);

  const rawPayload = await callGeminiScanWithCascade(
    '/api/gemini/scan-plate',
    base64Data,
    mimeType,
    onStatusUpdate
  );

  const parsed = parseGeminiJsonResponse(rawPayload, [
    'plateNumber',
    'formattedSummary',
    'plate',
    'vehicleMake'
  ]);

  const plateNumber = String(
    parsed.plateNumber || parsed.plate_number || parsed.plate || 'UNREADABLE'
  )
    .trim()
    .toUpperCase();
  const plateState = String(
    parsed.plateState || parsed.plate_state || parsed.state || ''
  )
    .trim()
    .toUpperCase();
  const vehicleColor = String(
    parsed.vehicleColor || parsed.vehicle_color || parsed.color || ''
  ).trim();
  const vehicleMake = String(
    parsed.vehicleMake || parsed.vehicle_make || parsed.make || ''
  ).trim();
  const vehicleModel = String(
    parsed.vehicleModel || parsed.vehicle_model || parsed.model || ''
  ).trim();

  const vehicleLabel =
    [vehicleColor, vehicleMake, vehicleModel].filter(Boolean).join(' ') || 'Vehicle';
  const plateLabel = plateState ? `${plateState} #${plateNumber}` : `#${plateNumber}`;
  const formattedSummary =
    String(parsed.formattedSummary || parsed.formatted_summary || '').trim() ||
    `${vehicleLabel}, ${plateLabel}`;

  if ((!plateNumber || plateNumber === 'UNREADABLE') && !vehicleMake && !vehicleModel && !parsed.formattedSummary) {
    throw new Error(
      `Vehicle/Plate Scan could not extract readable plate or vehicle details. Raw response: ${JSON.stringify(parsed).slice(0, 300)}`
    );
  }

  return {
    plateNumber,
    plateState,
    vehicleColor,
    vehicleMake,
    vehicleModel,
    formattedSummary,
    isSimulated: false,
    sampleImageDataUrl: dataUrl
  };
}

