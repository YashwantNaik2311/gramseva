import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { failure, getRequestId, success } from '../lib/response.js';
import { log } from '../utils/logger.js';
import {
  createVoiceService,
  type VoiceService,
  validateAudioInput,
  validateSynthesisInput,
} from '../services/voiceService.js';

const defaultService = createVoiceService();

// Transcribe job names and our S3 object keys are constrained to this set.
const JOB_ID_PATTERN = /^[0-9a-zA-Z._-]{1,200}$/;

export function makeVoiceHandler(voiceService: VoiceService) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const requestId = getRequestId(event);
    try {
      const resource = event.resource ?? '';
      const method = event.httpMethod ?? '';

      if (resource === '/v1/voice/recognize' && method === 'POST') {
        if (!event.body) {
          return failure(requestId, 400, 'INVALID_INPUT', 'Request body is required');
        }

        let body: unknown;
        try {
          body = JSON.parse(event.body);
        } catch {
          return failure(requestId, 400, 'INVALID_INPUT', 'Request body must be valid JSON');
        }

        const {
          language,
          audioBase64,
          mimeType,
        } = body as { language?: string; audioBase64?: string; mimeType?: string };

        const validation = validateAudioInput(language ?? '', audioBase64 ?? '', mimeType ?? '');
        if (!validation.ok) {
          return failure(requestId, 400, validation.code, validation.message);
        }

        // Validation guarantees these are non-empty strings.
        const lang = language as string;
        const audio = audioBase64 as string;
        const mime = mimeType as string;

        log({ requestId }, 'info', 'starting voice recognition', {
          language: lang,
          mimeType: mime,
          audioBase64Length: audio.length,
        });

        const result = await voiceService.startRecognition(lang, audio, mime);

        log({ requestId }, 'info', 'voice recognition started', { jobId: result.jobId });
        return success(requestId, result, 202);
      }

      if (resource === '/v1/voice/{jobId}' && method === 'GET') {
        const jobId = event.pathParameters?.jobId;
        if (!jobId || typeof jobId !== 'string' || !JOB_ID_PATTERN.test(jobId)) {
          return failure(requestId, 400, 'INVALID_INPUT', 'jobId path parameter is required and must be a valid identifier');
        }

        log({ requestId }, 'info', 'polling voice recognition', { jobId });
        const result = await voiceService.getRecognitionResult(jobId);
        log({ requestId }, 'info', 'voice recognition polled', { jobId, status: result.status });

        return success(requestId, result);
      }

      if (resource === '/v1/voice/synthesize' && method === 'POST') {
        if (!event.body) {
          return failure(requestId, 400, 'INVALID_INPUT', 'Request body is required');
        }

        let body: unknown;
        try {
          body = JSON.parse(event.body);
        } catch {
          return failure(requestId, 400, 'INVALID_INPUT', 'Request body must be valid JSON');
        }

        const { language, text } = body as { language?: string; text?: string };

        const validation = validateSynthesisInput(language ?? '', text ?? '');
        if (!validation.ok) {
          return failure(requestId, 400, validation.code, validation.message);
        }

        // Validation guarantees these are non-empty strings.
        const lang = language as string;
        const synthesisText = text as string;

        log({ requestId }, 'info', 'starting voice synthesis', {
          language: lang,
          textLength: synthesisText.length,
        });

        const result = await voiceService.synthesize(lang, synthesisText);

        log({ requestId }, 'info', 'voice synthesis completed', { language });
        return success(requestId, result);
      }

      return failure(requestId, 404, 'NOT_FOUND', 'Endpoint not found');
    } catch (err) {
      log({ requestId }, 'error', 'voice handler error', {
        errorType: err instanceof Error ? err.name : 'Unknown',
      });
      return failure(
        requestId,
        502,
        'VOICE_SERVICE_ERROR',
        'Voice service failed. Please try again or use text input.'
      );
    }
  };
}

export const handler = makeVoiceHandler(defaultService);
