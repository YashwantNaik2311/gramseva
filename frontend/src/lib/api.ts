import type {
  ApiEnvelope,
  Profile,
  ProfileInput,
  Candidate,
  Scheme,
  RecognitionStartResult,
  RecognitionResult,
  SynthesisResult,
  SupportedLanguage,
} from './types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/').replace(/\/?$/, '/');

const TIMEOUT_MS = 30_000;

export type ApiErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'INVALID_INPUT'
  | 'EXTRACTION_FAILED'
  | 'MATCH_ERROR'
  | 'SCHEME_NOT_FOUND'
  | 'SCHEME_DATA_INVALID'
  | 'VOICE_SERVICE_ERROR'
  | 'UNSUPPORTED_LANGUAGE'
  | 'UNSUPPORTED_AUDIO_FORMAT'
  | 'AUDIO_TOO_LARGE'
  | 'TEXT_TOO_LONG'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR'
  | 'UNKNOWN';

export class ApiError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'The request took too long.');
    }
    throw new ApiError('NETWORK', 'Could not reach GramSeva. Check your connection.');
  }
  clearTimeout(timer);

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('UNKNOWN', 'Received an unexpected response.');
  }

  if (!envelope.ok) {
    const code = (envelope.error?.code as ApiErrorCode) ?? 'UNKNOWN';
    throw new ApiError(code, envelope.error?.message ?? 'Something went wrong.');
  }

  return envelope.data as T;
}

export const api = {
  health(): Promise<{ status: string; service: string; version: string }> {
    return request<{ status: string; service: string; version: string }>('v1/health');
  },

  extractProfile(input: ProfileInput): Promise<Profile> {
    return request<Profile>('v1/profiles', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getRecommendations(profile: Profile): Promise<{ candidates: Candidate[] }> {
    return request<{ candidates: Candidate[] }>('v1/recommendations', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  },

  getScheme(schemeId: string): Promise<{ scheme: Scheme }> {
    return request<{ scheme: Scheme }>(`v1/schemes/${encodeURIComponent(schemeId)}`);
  },

  startRecognition(language: SupportedLanguage, audioBase64: string, mimeType: string): Promise<RecognitionStartResult> {
    return request<RecognitionStartResult>('v1/voice/recognize', {
      method: 'POST',
      body: JSON.stringify({ language, audioBase64, mimeType }),
    });
  },

  getRecognitionResult(jobId: string): Promise<RecognitionResult> {
    return request<RecognitionResult>(`v1/voice/${encodeURIComponent(jobId)}`);
  },

  synthesize(language: SupportedLanguage, text: string): Promise<SynthesisResult> {
    return request<SynthesisResult>('v1/voice/synthesize', {
      method: 'POST',
      body: JSON.stringify({ language, text }),
    });
  },
};
