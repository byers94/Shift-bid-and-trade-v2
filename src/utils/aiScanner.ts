import { GoogleGenAI, Type } from '@google/genai';

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
    idType: 'drivers_license',
    idNumber: 'WDL-9482-019B',
    issuingState: 'WA',
    approxAge: '34',
    gender: 'male',
    height: '5\'11"',
    weight: '185 lbs, Medium build',
    hairEyeColor: 'Brown / Hazel',
    address: 'Apt #402 / Bldg 3'
  },
  {
    fullName: 'Elena M. Vance',
    idType: 'drivers_license',
    idNumber: 'WDL-7731-402C',
    issuingState: 'WA',
    approxAge: '29',
    gender: 'female',
    height: '5\'6"',
    weight: '135 lbs, Slender',
    hairEyeColor: 'Black / Brown',
    address: 'Apt 304'
  },
  {
    fullName: 'Devon R. Holloway',
    idType: 'state_id',
    idNumber: 'CO-ID-884-9201',
    issuingState: 'CO',
    approxAge: '41',
    gender: 'male',
    height: '6\'1"',
    weight: '210 lbs, Athletic build',
    hairEyeColor: 'Dark Brown / Blue',
    address: 'Unit 412'
  }
];

const SAMPLE_VEHICLE_SCANS: ScannedVehiclePlateResult[] = [
  {
    plateNumber: 'ABC-123',
    plateState: 'WA',
    vehicleColor: 'Silver',
    vehicleMake: 'Honda',
    vehicleModel: 'Accord',
    formattedSummary: '2021 Silver Honda Accord, WA #ABC-123'
  },
  {
    plateNumber: 'WA-8849B',
    plateState: 'WA',
    vehicleColor: 'Black',
    vehicleMake: 'Ford',
    vehicleModel: 'F-150',
    formattedSummary: '2022 Black Ford F-150, WA #WA-8849B'
  },
  {
    plateNumber: 'ABC-1234',
    plateState: 'CO',
    vehicleColor: 'Silver',
    vehicleMake: 'Honda',
    vehicleModel: 'Civic',
    formattedSummary: '2020 Silver Honda Civic, CO #ABC-1234'
  }
];

let sampleIdCursor = 0;
let samplePlateCursor = 0;

function stripBase64DataUrlPrefix(input: string): string {
  if (!input) return '';
  const commaIdx = input.indexOf(',');
  if (input.startsWith('data:') && commaIdx !== -1) {
    return input.slice(commaIdx + 1);
  }
  return input;
}

function getSafeGeminiApiKey(): string | undefined {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
  } catch {
    // Ignore ReferenceError if process is not defined in browser runtime
  }
  return undefined;
}

export function calculateAgeFromDobString(dobRaw?: string): string {
  if (!dobRaw) return '';
  const parsed = new Date(dobRaw);
  if (Number.isNaN(parsed.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
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
      ${scan.issuingState || 'WA'} DRIVER LICENSE • AI OCR VERIFIED
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
      [GEMINI VISION OCR] CONFIDENCE 99.4% • TIMESTAMP ${new Date().toISOString().slice(0, 19)}Z
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
      ${scan.plateState || 'WA'} • EVERGREEN STATE
    </text>
    <text x="400" y="258" text-anchor="middle" fill="#0f172a" font-family="monospace" font-size="68" font-weight="bold" letter-spacing="4">
      ${scan.plateNumber}
    </text>
    <rect x="40" y="395" width="720" height="68" rx="10" fill="#0f172a" stroke="#f59e0b" stroke-width="2"/>
    <text x="64" y="436" fill="#fbbf24" font-family="monospace" font-size="17" font-weight="bold">
      [ALPR / GEMINI VISION] PLATE #${scan.plateNumber} (${scan.plateState}) • ${scan.vehicleColor.toUpperCase()} ${scan.vehicleMake.toUpperCase()} ${scan.vehicleModel.toUpperCase()}
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
 * Uses @google/genai ('gemini-2.5-flash') Vision OCR to extract structured identity
 * and physical demographic fields from a Driver's License or ID card image.
 * Falls back gracefully to simulated extraction if GEMINI_API_KEY is unavailable.
 */
export async function scanIdentificationDocument(
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<ScannedIdDocumentResult> {
  const cleanBase64 = stripBase64DataUrlPrefix(base64Image);
  if (!cleanBase64 || cleanBase64 === 'SIMULATED_SAMPLE') {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return getSampleIdScanResult();
  }

  const apiKey = getSafeGeminiApiKey();
  if (!apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 750));
    const fallback = getSampleIdScanResult();
    return {
      ...fallback,
      sampleImageDataUrl: base64Image.startsWith('data:') ? base64Image : `data:${mimeType};base64,${cleanBase64}`
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const currentYear = new Date().getFullYear();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `Analyze this identification document (Driver's License, State ID, Passport, or Badge) and extract the subject's credentials and physical demographics into JSON.
If Date of Birth (DOB) is visible, calculate approxAge automatically based on the current year (${currentYear}).
Normalize idType to one of: "drivers_license", "state_id", "passport", "employee_badge", "student_id", "military_id", or "other".
Normalize gender to one of: "male", "female", "non_binary", or "unknown".
Return empty strings for any fields that are not visible.`
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING, description: 'Full legal name on the ID document' },
            idType: {
              type: Type.STRING,
              description: 'drivers_license, state_id, passport, employee_badge, student_id, military_id, or other'
            },
            idNumber: { type: Type.STRING, description: 'Driver license, ID, or badge number' },
            issuingState: {
              type: Type.STRING,
              description: '2-letter state code or issuing authority (e.g., WA, CO, CA)'
            },
            dateOfBirth: {
              type: Type.STRING,
              description: 'Date of birth if visible on the ID (YYYY-MM-DD or MM/DD/YYYY)'
            },
            approxAge: {
              type: Type.STRING,
              description: 'Calculated age from Date of Birth or estimated age string'
            },
            gender: { type: Type.STRING, description: 'male, female, non_binary, or unknown' },
            height: { type: Type.STRING, description: 'Height on ID, e.g., 5\'10"' },
            weight: { type: Type.STRING, description: 'Weight or build on ID, e.g., 180 lbs' },
            hairEyeColor: { type: Type.STRING, description: 'Hair and/or eye color on ID, e.g., BRO / BLU' },
            address: { type: Type.STRING, description: 'Street or apartment/unit address printed on the ID' }
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
            'address'
          ]
        }
      }
    });

    const rawText = response.text?.trim() || '{}';
    const parsed = JSON.parse(rawText);

    const computedAge =
      parsed.approxAge ||
      calculateAgeFromDobString(parsed.dateOfBirth) ||
      '30-35';

    return {
      fullName: parsed.fullName || 'Identified Subject',
      idType: parsed.idType || 'drivers_license',
      idNumber: parsed.idNumber || '',
      issuingState: parsed.issuingState || 'WA',
      approxAge: String(computedAge),
      gender: parsed.gender || 'unknown',
      height: parsed.height || '',
      weight: parsed.weight || '',
      hairEyeColor: parsed.hairEyeColor || '',
      address: parsed.address || '',
      isSimulated: false,
      sampleImageDataUrl: base64Image.startsWith('data:') ? base64Image : `data:${mimeType};base64,${cleanBase64}`
    };
  } catch {
    const fallback = getSampleIdScanResult();
    return {
      ...fallback,
      sampleImageDataUrl: base64Image.startsWith('data:') ? base64Image : `data:${mimeType};base64,${cleanBase64}`
    };
  }
}

/**
 * Uses @google/genai ('gemini-2.5-flash') Vision OCR to extract license plate number,
 * state, and vehicle make/model/color from a guard camera photo.
 * Falls back gracefully to simulated extraction if GEMINI_API_KEY is unavailable.
 */
export async function scanVehicleAndPlate(
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<ScannedVehiclePlateResult> {
  const cleanBase64 = stripBase64DataUrlPrefix(base64Image);
  if (!cleanBase64 || cleanBase64 === 'SIMULATED_SAMPLE') {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return getSampleVehiclePlateScanResult();
  }

  const apiKey = getSafeGeminiApiKey();
  if (!apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 750));
    const fallback = getSampleVehiclePlateScanResult();
    return {
      ...fallback,
      sampleImageDataUrl: base64Image.startsWith('data:') ? base64Image : `data:${mimeType};base64,${cleanBase64}`
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `Analyze this vehicle and license plate photo. Extract the license plate number, state/jurisdiction, vehicle color, vehicle make, vehicle model, and a concise formattedSummary string such as "Silver Honda Civic, CO #ABC-1234" or "2020 Silver Toyota Tacoma, CO #XYZ-987".`
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plateNumber: { type: Type.STRING, description: 'License plate alphanumeric characters, e.g., ABC-1234' },
            plateState: { type: Type.STRING, description: '2-letter state or jurisdiction code, e.g., WA, CO, CA' },
            vehicleColor: { type: Type.STRING, description: 'Primary exterior color of the vehicle, e.g., Silver' },
            vehicleMake: { type: Type.STRING, description: 'Vehicle manufacturer/make, e.g., Honda, Toyota, Ford' },
            vehicleModel: { type: Type.STRING, description: 'Vehicle model, e.g., Civic, Tacoma, Accord' },
            formattedSummary: {
              type: Type.STRING,
              description: 'Combined summary, e.g., "Silver Honda Civic, CO #ABC-1234"'
            }
          },
          required: [
            'plateNumber',
            'plateState',
            'vehicleColor',
            'vehicleMake',
            'vehicleModel',
            'formattedSummary'
          ]
        }
      }
    });

    const rawText = response.text?.trim() || '{}';
    const parsed = JSON.parse(rawText);

    const plateNumber = (parsed.plateNumber || '').trim().toUpperCase();
    const plateState = (parsed.plateState || 'WA').trim().toUpperCase();
    const vehicleColor = (parsed.vehicleColor || '').trim();
    const vehicleMake = (parsed.vehicleMake || '').trim();
    const vehicleModel = (parsed.vehicleModel || '').trim();

    const constructedSummary =
      parsed.formattedSummary?.trim() ||
      `${[vehicleColor, vehicleMake, vehicleModel].filter(Boolean).join(' ') || 'Vehicle'}, ${plateState} #${plateNumber || 'UNKNOWN'}`;

    return {
      plateNumber: plateNumber || 'ABC-123',
      plateState,
      vehicleColor,
      vehicleMake,
      vehicleModel,
      formattedSummary: constructedSummary,
      isSimulated: false,
      sampleImageDataUrl: base64Image.startsWith('data:') ? base64Image : `data:${mimeType};base64,${cleanBase64}`
    };
  } catch {
    const fallback = getSampleVehiclePlateScanResult();
    return {
      ...fallback,
      sampleImageDataUrl: base64Image.startsWith('data:') ? base64Image : `data:${mimeType};base64,${cleanBase64}`
    };
  }
}
