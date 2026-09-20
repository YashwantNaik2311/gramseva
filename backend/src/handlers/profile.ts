import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { failure, getRequestId, success } from '../lib/response.js';
import { log } from '../utils/logger.js';
import { normalizeProfile, ProfileInputSchema, type AttributeName, validateProfile } from '../models/profile.js';
import { createExtractor, type ProfileExtractor } from '../services/extractor.js';

const defaultExtractor = createExtractor();

export function makeProfileHandler(extractor: ProfileExtractor) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const requestId = getRequestId(event);
    try {
      if (!event.body) {
        return failure(requestId, 400, 'INVALID_INPUT', 'Request body is required');
      }

      let body: unknown;
      try {
        body = JSON.parse(event.body);
      } catch {
        return failure(requestId, 400, 'INVALID_INPUT', 'Request body must be valid JSON');
      }

      const parsed = ProfileInputSchema.safeParse(body);
      if (!parsed.success) {
        return failure(requestId, 400, 'INVALID_INPUT', 'Invalid input: language must be hi/kn/en and text must be 1-2000 characters');
      }

      const { language, text } = parsed.data;
      log({ requestId }, 'info', 'extracting profile', {
        language,
        textLength: text.length,
      });

      const profile = await extractor.extract({ language, text });

      // Defense-in-depth: re-normalize and validate extractor output to enforce
      // safety rules (e.g., sensitive low-confidence attributes become unknown).
      const sanitized = normalizeProfile({
        language: profile.language,
        rawText: profile.rawText,
        attributes: profile.attributes as Partial<
          Record<AttributeName, Partial<{ status: string; value?: unknown; confidence?: string | null }>>
        >,
      });
      const validated = validateProfile(sanitized);
      if (!validated) {
        throw new Error('Extracted profile failed schema validation');
      }

      log({ requestId }, 'info', 'profile extracted', {
        language,
        attributeStatuses: Object.fromEntries(
          Object.entries(validated.attributes).map(([k, v]) => [k, v.status])
        ),
      });

      return success(requestId, validated);
    } catch (err) {
      log({ requestId }, 'error', 'profile extraction failed', {
        errorType: err instanceof Error ? err.name : 'Unknown',
      });
      return failure(
        requestId,
        502,
        'EXTRACTION_FAILED',
        'We could not understand the description. Please try again or type a simpler version.'
      );
    }
  };
}

export const handler = makeProfileHandler(defaultExtractor);
