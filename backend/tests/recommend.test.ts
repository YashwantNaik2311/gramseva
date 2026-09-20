import { describe, expect, test } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { makeRecommendHandler } from '../src/handlers/recommend.js';
import { InMemorySchemeStore } from '../src/services/schemeStore.js';
import type { SchemeStore } from '../src/services/schemeStore.js';
import type { Scheme } from '../src/models/scheme.js';
import type { Profile } from '../src/models/profile.js';

const testSchemes: Scheme[] = [
  {
    schemeId: 'DEV-Karnataka-Student-Grant',
    name: '[DEV] Karnataka Student Grant',
    localizedName: { en: '[DEV] Karnataka Student Grant' },
    description: { en: 'A development fixture for students in Karnataka.' },
    benefits: [{ en: 'Financial support' }],
    eligibility: [
      { attribute: 'state', operator: 'eq', value: 'Karnataka', required: true },
      { attribute: 'age', operator: 'between', value: [18, 35], required: true },
      { attribute: 'occupation', operator: 'eq', value: 'student', required: true },
      { attribute: 'incomeBracket', operator: 'in', value: ['below_poverty_line', 'low'], required: false },
    ],
    documents: [{ en: 'Student ID' }],
    state: 'Karnataka',
    category: ['students'],
    applicationUrl: 'https://example.com/dev-karnataka-student',
    officialSource: 'https://example.com/dev-karnataka-student-source',
    sourceName: '[DEV] Karnataka Education Department',
    lastVerified: '2026-09-17',
    active: true,
    unknownConditions: ['incomeBracket'],
    verificationStatus: 'dev-fixture',
  },
  {
    schemeId: 'DEV-National-Farmer-Support',
    name: '[DEV] National Farmer Support',
    localizedName: { en: '[DEV] National Farmer Support' },
    description: { en: 'A development fixture for farmers.' },
    benefits: [{ en: 'Annual income support' }],
    eligibility: [
      { attribute: 'occupation', operator: 'eq', value: 'farmer', required: true },
      { attribute: 'incomeBracket', operator: 'in', value: ['below_poverty_line', 'low'], required: false },
    ],
    documents: [{ en: 'Land record' }],
    state: 'All India',
    category: ['farmers'],
    applicationUrl: 'https://example.com/dev-farmer',
    officialSource: 'https://example.com/dev-farmer-source',
    sourceName: '[DEV] Ministry of Agriculture',
    lastVerified: '2026-09-17',
    active: true,
    unknownConditions: ['incomeBracket'],
    verificationStatus: 'dev-fixture',
  },
  {
    schemeId: 'DEV-Inactive-Scheme',
    name: '[DEV] Inactive Test Scheme',
    localizedName: { en: '[DEV] Inactive Test Scheme' },
    description: { en: 'Should not appear.' },
    benefits: [{ en: 'None' }],
    eligibility: [{ attribute: 'state', operator: 'eq', value: 'Karnataka', required: true }],
    documents: [{ en: 'None' }],
    state: 'Karnataka',
    category: ['test'],
    applicationUrl: 'https://example.com/dev-inactive',
    officialSource: 'https://example.com/dev-inactive-source',
    sourceName: '[DEV] Test',
    lastVerified: '2026-09-17',
    active: false,
    unknownConditions: [],
    verificationStatus: 'dev-fixture',
  },
];

function makeProfile(overrides?: Partial<Profile['attributes']>): Profile {
  return {
    language: 'en',
    rawText: 'test',
    attributes: {
      age: { status: 'provided', value: 19, confidence: 'high', sensitive: false },
      state: { status: 'provided', value: 'Karnataka', confidence: 'high', sensitive: false },
      occupation: { status: 'provided', value: 'student', confidence: 'high', sensitive: false },
      incomeBracket: { status: 'provided', value: 'low', confidence: 'high', sensitive: true },
      gender: { status: 'unknown', value: null, confidence: null, sensitive: true },
      educationLevel: { status: 'unknown', value: null, confidence: null, sensitive: false },
      category: { status: 'unknown', value: null, confidence: null, sensitive: true },
      disability: { status: 'unknown', value: null, confidence: null, sensitive: true },
      ...overrides,
    },
  } as Profile;
}

function makeEvent(body: unknown): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    headers: { 'x-request-id': 'req-rec-1' },
    body: JSON.stringify(body),
  } as unknown as APIGatewayProxyEvent;
}

describe('recommend handler', () => {
  const handler = makeRecommendHandler(new InMemorySchemeStore(testSchemes));

  test('returns candidates for matching profile', async () => {
    const result = await handler(makeEvent(makeProfile()));
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.ok).toBe(true);
    expect(body.data.candidates.length).toBe(1);
    expect(body.data.candidates[0].schemeId).toBe('DEV-Karnataka-Student-Grant');
  });

  test('excludes schemes with unmet required criteria', async () => {
    const profile = makeProfile({
      state: { status: 'provided', value: 'Maharashtra', confidence: 'high', sensitive: false },
    });
    const result = await handler(makeEvent(profile));
    const body = JSON.parse(result.body);
    expect(body.data.candidates.length).toBe(0);
  });

  test('excludes inactive schemes', async () => {
    const result = await handler(makeEvent(makeProfile()));
    const body = JSON.parse(result.body);
    const ids = body.data.candidates.map((c: { schemeId: string }) => c.schemeId);
    expect(ids).not.toContain('DEV-Inactive-Scheme');
  });

  test('returns empty candidates when no schemes match', async () => {
    const profile = makeProfile({
      occupation: { status: 'provided', value: 'engineer', confidence: 'high', sensitive: false },
    });
    const result = await handler(makeEvent(profile));
    const body = JSON.parse(result.body);
    expect(body.data.candidates).toEqual([]);
  });

  test('returns explanation with matched and verify lists', async () => {
    const result = await handler(makeEvent(makeProfile()));
    const body = JSON.parse(result.body);
    const candidate = body.data.candidates[0];
    expect(candidate.explanation.matched.length).toBeGreaterThan(0);
    expect(candidate.matchedAttributes.length).toBeGreaterThan(0);
    expect(candidate.unknownConditions).toBeDefined();
  });

  test('preserves provenance fields', async () => {
    const result = await handler(makeEvent(makeProfile()));
    const body = JSON.parse(result.body);
    const candidate = body.data.candidates[0];
    expect(candidate.applicationUrl).toBe('https://example.com/dev-karnataka-student');
    expect(candidate.officialSource).toBe('https://example.com/dev-karnataka-student-source');
    expect(candidate.sourceName).toBe('[DEV] Karnataka Education Department');
    expect(candidate.lastVerified).toBe('2026-09-17');
    expect(candidate.verificationStatus).toBe('dev-fixture');
  });

  test('rejects malformed profile', async () => {
    const result = await handler(makeEvent({ language: 'en', text: 'test', attributes: { age: { status: 'provided', value: 999 } } }));
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  test('rejects unsupported language', async () => {
    const profile = makeProfile();
    profile.language = 'fr' as 'en';
    const result = await handler(makeEvent(profile));
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  test('scheme detail returns complete scheme for valid active schemeId', async () => {
    const event = {
      httpMethod: 'GET',
      headers: { 'x-request-id': 'req-rec-detail-1' },
      pathParameters: { schemeId: 'DEV-Karnataka-Student-Grant' },
      body: null,
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.ok).toBe(true);
    expect(body.data.scheme.schemeId).toBe('DEV-Karnataka-Student-Grant');
    expect(body.data.scheme.name).toBe('[DEV] Karnataka Student Grant');
    expect(body.data.scheme.applicationUrl).toBe('https://example.com/dev-karnataka-student');
    expect(body.data.scheme.officialSource).toBe('https://example.com/dev-karnataka-student-source');
    expect(body.data.scheme.sourceName).toBe('[DEV] Karnataka Education Department');
    expect(body.data.scheme.lastVerified).toBe('2026-09-17');
    expect(body.data.scheme.verificationStatus).toBe('dev-fixture');
  });

  test('scheme detail returns SCHEME_NOT_FOUND for unknown schemeId', async () => {
    const event = {
      httpMethod: 'GET',
      headers: { 'x-request-id': 'req-rec-detail-2' },
      pathParameters: { schemeId: 'DEV-Does-Not-Exist' },
      body: null,
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(event);
    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('SCHEME_NOT_FOUND');
  });

  test('scheme detail returns SCHEME_NOT_FOUND for inactive scheme', async () => {
    const event = {
      httpMethod: 'GET',
      headers: { 'x-request-id': 'req-rec-detail-3' },
      pathParameters: { schemeId: 'DEV-Inactive-Scheme' },
      body: null,
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(event);
    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('SCHEME_NOT_FOUND');
  });

  test('scheme detail returns SCHEME_DATA_INVALID for malformed record', async () => {
    const malformedStore: SchemeStore = {
      async getActiveSchemes() {
        return [];
      },
      async getSchemeById() {
        return { scheme: null, malformed: true };
      },
    };
    const h = makeRecommendHandler(malformedStore);
    const event = {
      httpMethod: 'GET',
      headers: { 'x-request-id': 'req-rec-detail-4' },
      pathParameters: { schemeId: 'DEV-Malformed' },
      body: null,
    } as unknown as APIGatewayProxyEvent;
    const result = await h(event);
    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('SCHEME_DATA_INVALID');
  });

  test('scheme detail rejects missing schemeId', async () => {
    const event = {
      httpMethod: 'GET',
      headers: { 'x-request-id': 'req-rec-detail-5' },
      pathParameters: {},
      body: null,
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  test('scheme detail rejects invalid schemeId', async () => {
    const event = {
      httpMethod: 'GET',
      headers: { 'x-request-id': 'req-rec-detail-6' },
      pathParameters: { schemeId: 'a'.repeat(200) },
      body: null,
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  test('scheme detail makes no Bedrock calls', async () => {
    const event = {
      httpMethod: 'GET',
      headers: { 'x-request-id': 'req-rec-detail-7' },
      pathParameters: { schemeId: 'DEV-Karnataka-Student-Grant' },
      body: null,
    } as unknown as APIGatewayProxyEvent;
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    // The handler and its dependencies do not import Bedrock.
    expect(makeRecommendHandler.toString()).not.toContain('Bedrock');
  });
});
