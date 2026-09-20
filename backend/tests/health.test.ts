import { describe, expect, test } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../src/handlers/health.js';

describe('health handler', () => {
  test('returns ok with requestId from header', async () => {
    const event = {
      headers: { 'x-request-id': 'req-123' },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.ok).toBe(true);
    expect(body.requestId).toBe('req-123');
    expect(body.data.status).toBe('ok');
    expect(body.data.service).toBe('gramseva');
  });

  test('returns ok with generated requestId when header missing', async () => {
    const event = { headers: {} } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.ok).toBe(true);
    expect(typeof body.requestId).toBe('string');
    expect(body.requestId.length).toBeGreaterThan(0);
  });
});
