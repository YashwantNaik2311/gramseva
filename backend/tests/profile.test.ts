import { describe, expect, test } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { makeProfileHandler } from '../src/handlers/profile.js';
import { MockProfileExtractor } from '../src/services/extractor.js';
import type { Profile } from '../src/models/profile.js';

function makeEvent(body: unknown): APIGatewayProxyEvent {
  return {
    headers: { 'x-request-id': 'req-profile-1' },
    body: JSON.stringify(body),
  } as unknown as APIGatewayProxyEvent;
}

describe('profile handler', () => {
  const handler = makeProfileHandler(new MockProfileExtractor());

  test('returns a valid English profile response', async () => {
    const event = makeEvent({ language: 'en', text: 'I am a 19 year old student in Karnataka from a low income family.' });
    const result = await handler(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.ok).toBe(true);
    expect(body.requestId).toBe('req-profile-1');
    expect(body.data.language).toBe('en');
    expect(body.data.attributes.age.status).toBe('provided');
    expect(body.data.attributes.age.value).toBe(19);
    expect(body.data.attributes.state.value).toBe('Karnataka');
    expect(body.data.attributes.occupation.value).toBe('student');
    expect(body.data.attributes.incomeBracket.value).toBe('low');
  });

  test('accepts Hindi input', async () => {
    const event = makeEvent({ language: 'hi', text: 'मैं कर्नाटक का छात्र हूँ।' });
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.language).toBe('hi');
    // Mock extractor is keyword-based on English/latin tokens; real Bedrock
    // handles Hindi extraction. This test only verifies language acceptance.
  });

  test('accepts Kannada input', async () => {
    const event = makeEvent({ language: 'kn', text: 'ನಾನು ಕರ್ನಾಟಕದ ವಿದ್ಯಾರ್ಥಿ.' });
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.language).toBe('kn');
    // Mock extractor is keyword-based on English/latin tokens; real Bedrock
    // handles Kannada extraction. This test only verifies language acceptance.
  });

  test('marks unknown attributes when not mentioned', async () => {
    const event = makeEvent({ language: 'en', text: 'I live in Karnataka.' });
    const result = await handler(event);
    const body = JSON.parse(result.body);
    expect(body.data.attributes.age.status).toBe('unknown');
    expect(body.data.attributes.incomeBracket.status).toBe('unknown');
    expect(body.data.attributes.educationLevel.status).toBe('unknown');
  });

  test('keeps sensitive attributes provided when explicitly stated with high confidence', async () => {
    const event = makeEvent({ language: 'en', text: 'I am an SC category student.' });
    const result = await handler(event);
    const body = JSON.parse(result.body);
    expect(body.data.attributes.category.status).toBe('provided');
    expect(body.data.attributes.category.value).toBe('SC');
  });

  test('keeps sensitive attributes unknown when not explicitly stated', async () => {
    const event = makeEvent({ language: 'en', text: 'I am a student in Karnataka.' });
    const result = await handler(event);
    const body = JSON.parse(result.body);
    expect(body.data.attributes.category.status).toBe('unknown');
    expect(body.data.attributes.disability.status).toBe('unknown');
    expect(body.data.attributes.gender.status).toBe('unknown');
    expect(body.data.attributes.incomeBracket.status).toBe('unknown');
  });

  test('demotes low-confidence sensitive attributes to unknown', async () => {
    const extractor = {
      async extract(): Promise<Profile> {
        return {
          language: 'en',
          rawText: 'test',
          attributes: {
            age: { status: 'unknown', value: null, confidence: null, sensitive: false },
            state: { status: 'unknown', value: null, confidence: null, sensitive: false },
            occupation: { status: 'unknown', value: null, confidence: null, sensitive: false },
            incomeBracket: { status: 'provided', value: 'low', confidence: 'medium', sensitive: true },
            gender: { status: 'unknown', value: null, confidence: null, sensitive: true },
            educationLevel: { status: 'unknown', value: null, confidence: null, sensitive: false },
            category: { status: 'provided', value: 'SC', confidence: 'low', sensitive: true },
            disability: { status: 'unknown', value: null, confidence: null, sensitive: true },
          },
        };
      },
    };
    const h = makeProfileHandler(extractor);
    const result = await h(makeEvent({ language: 'en', text: 'test' }));
    const body = JSON.parse(result.body);
    expect(body.data.attributes.incomeBracket.status).toBe('unknown');
    expect(body.data.attributes.category.status).toBe('unknown');
  });

  test('returns EXTRACTION_FAILED for malformed extractor output', async () => {
    const badExtractor = {
      async extract(): Promise<Profile> {
        return {
          language: 'en',
          rawText: 'test',
          attributes: {
            age: { status: 'provided', value: 999, confidence: 'high', sensitive: false },
            state: { status: 'unknown', value: null, confidence: null, sensitive: false },
            occupation: { status: 'unknown', value: null, confidence: null, sensitive: false },
            incomeBracket: { status: 'unknown', value: null, confidence: null, sensitive: true },
            gender: { status: 'unknown', value: null, confidence: null, sensitive: true },
            educationLevel: { status: 'unknown', value: null, confidence: null, sensitive: false },
            category: { status: 'unknown', value: null, confidence: null, sensitive: true },
            disability: { status: 'unknown', value: null, confidence: null, sensitive: true },
          },
        };
      },
    };
    const h = makeProfileHandler(badExtractor);
    const result = await h(makeEvent({ language: 'en', text: 'test' }));
    expect(result.statusCode).toBe(502);
    const body = JSON.parse(result.body);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('EXTRACTION_FAILED');
  });

  test('rejects unsupported language', async () => {
    const event = makeEvent({ language: 'fr', text: 'Je suis étudiant.' });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  test('rejects oversized input', async () => {
    const event = makeEvent({ language: 'en', text: 'a'.repeat(2001) });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  test('rejects missing body', async () => {
    const event = { headers: {}, body: null } as unknown as APIGatewayProxyEvent;
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });
});
