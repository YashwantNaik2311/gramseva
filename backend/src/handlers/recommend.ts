import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { failure, getRequestId, success } from '../lib/response.js';
import { log } from '../utils/logger.js';
import { matchSchemes, toCandidate } from '../lib/matcher.js';
import { ProfileSchema } from '../models/profile.js';
import { createSchemeStore, type SchemeStore } from '../services/schemeStore.js';

const defaultStore = createSchemeStore();

const MAX_SCHEME_ID_LENGTH = 128;

function isValidSchemeId(schemeId: string | undefined): schemeId is string {
  return typeof schemeId === 'string' && schemeId.length > 0 && schemeId.length <= MAX_SCHEME_ID_LENGTH;
}

export function makeRecommendHandler(store: SchemeStore) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const requestId = getRequestId(event);
    try {
      if (event.httpMethod === 'GET' && event.pathParameters?.schemeId !== undefined) {
        const schemeId = event.pathParameters.schemeId;
        if (!isValidSchemeId(schemeId)) {
          return failure(requestId, 400, 'INVALID_INPUT', 'schemeId is required and must be a valid identifier');
        }

        log({ requestId }, 'info', 'fetching scheme detail', { schemeId });

        const lookup = await store.getSchemeById(schemeId);
        if (lookup.malformed) {
          log({ requestId }, 'error', 'scheme record failed validation', { schemeId });
          return failure(requestId, 500, 'SCHEME_DATA_INVALID', 'Scheme data is invalid');
        }

        const scheme = lookup.scheme;
        if (!scheme || !scheme.active) {
          return failure(requestId, 404, 'SCHEME_NOT_FOUND', 'Scheme not found');
        }

        log({ requestId }, 'info', 'scheme detail returned', { schemeId, verificationStatus: scheme.verificationStatus });
        return success(requestId, { scheme });
      }

      if (event.httpMethod === 'GET') {
        return failure(requestId, 400, 'INVALID_INPUT', 'schemeId path parameter is required');
      }

      if (event.httpMethod !== 'POST') {
        return failure(requestId, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
      }

      if (!event.body) {
        return failure(requestId, 400, 'INVALID_INPUT', 'Request body is required');
      }

      let body: unknown;
      try {
        body = JSON.parse(event.body);
      } catch {
        return failure(requestId, 400, 'INVALID_INPUT', 'Request body must be valid JSON');
      }

      const parsed = ProfileSchema.safeParse(body);
      if (!parsed.success) {
        return failure(requestId, 400, 'INVALID_INPUT', 'Invalid profile: ' + parsed.error.errors.map((e) => e.message).join(', '));
      }

      const profile = parsed.data;
      log({ requestId }, 'info', 'matching schemes', {
        language: profile.language,
        providedAttributes: Object.entries(profile.attributes)
          .filter(([, v]) => v.status === 'provided')
          .map(([k]) => k),
      });

      const schemes = await store.getActiveSchemes();
      const results = matchSchemes(schemes, profile);
      const candidates = results.map((r) => toCandidate(r, profile.attributes, profile.language));

      log({ requestId }, 'info', 'recommendations generated', {
        schemeCount: schemes.length,
        candidateCount: candidates.length,
      });

      return success(requestId, { candidates });
    } catch (err) {
      log({ requestId }, 'error', 'recommendation failed', {
        errorType: err instanceof Error ? err.name : 'Unknown',
      });
      return failure(requestId, 500, 'MATCH_ERROR', 'Could not generate recommendations. Please try again.');
    }
  };
}

export const handler = makeRecommendHandler(defaultStore);
