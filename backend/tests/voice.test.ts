import { describe, expect, test } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { makeVoiceHandler } from '../src/handlers/voice.js';
import { MockVoiceService, type VoiceService, validateAudioInput } from '../src/services/voiceService.js';

const validAudioBase64 = Buffer.from('fake-audio-data').toString('base64');

function makeEvent(resource: string, method: string, body?: unknown, pathParameters?: Record<string, string>): APIGatewayProxyEvent {
  return {
    resource,
    httpMethod: method,
    headers: { 'x-request-id': 'req-voice-1' },
    body: body ? JSON.stringify(body) : null,
    pathParameters: pathParameters ?? {},
  } as unknown as APIGatewayProxyEvent;
}

describe('voice handler', () => {
  test('recognize returns 202 with jobId', async () => {
    const service = new MockVoiceService();
    const handler = makeVoiceHandler(service);
    const result = await handler(
      makeEvent('/v1/voice/recognize', 'POST', {
        language: 'hi',
        audioBase64: validAudioBase64,
        mimeType: 'audio/webm',
      })
    );
    expect(result.statusCode).toBe(202);
    const body = JSON.parse(result.body);
    expect(body.ok).toBe(true);
    expect(body.data.jobId).toMatch(/^mock-/);
  });

  test('recognize rejects missing audio', async () => {
    const handler = makeVoiceHandler(new MockVoiceService());
    const result = await handler(
      makeEvent('/v1/voice/recognize', 'POST', { language: 'hi', mimeType: 'audio/webm' })
    );
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.ok).toBe(false);
  });

  test('recognize rejects unsupported audio format', async () => {
    const handler = makeVoiceHandler(new MockVoiceService());
    const result = await handler(
      makeEvent('/v1/voice/recognize', 'POST', {
        language: 'hi',
        audioBase64: validAudioBase64,
        mimeType: 'audio/flac',
      })
    );
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('UNSUPPORTED_AUDIO_FORMAT');
  });

  test('recognize rejects unsupported language', async () => {
    const handler = makeVoiceHandler(new MockVoiceService());
    const result = await handler(
      makeEvent('/v1/voice/recognize', 'POST', {
        language: 'fr',
        audioBase64: validAudioBase64,
        mimeType: 'audio/webm',
      })
    );
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('UNSUPPORTED_LANGUAGE');
  });

  test('recognize returns sanitized error on service failure', async () => {
    const brokenService: VoiceService = {
      async startRecognition() {
        throw new Error('Transcribe exploded');
      },
      async getRecognitionResult() {
        return { status: 'FAILED' };
      },
      async synthesize() {
        return { audioBase64: '', contentType: 'audio/mpeg' };
      },
    };
    const handler = makeVoiceHandler(brokenService);
    const result = await handler(
      makeEvent('/v1/voice/recognize', 'POST', {
        language: 'hi',
        audioBase64: validAudioBase64,
        mimeType: 'audio/webm',
      })
    );
    expect(result.statusCode).toBe(502);
    const body = JSON.parse(result.body);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VOICE_SERVICE_ERROR');
    expect(body.error.message).not.toContain('Transcribe exploded');
  });

  test('poll returns IN_PROGRESS for running job', async () => {
    const service = new MockVoiceService();
    const handler = makeVoiceHandler(service);
    const start = await handler(
      makeEvent('/v1/voice/recognize', 'POST', {
        language: 'hi',
        audioBase64: validAudioBase64,
        mimeType: 'audio/webm',
      })
    );
    const jobId = JSON.parse(start.body).data.jobId;

    const poll = await handler(makeEvent('/v1/voice/{jobId}', 'GET', undefined, { jobId }));
    expect(poll.statusCode).toBe(200);
    const body = JSON.parse(poll.body);
    expect(body.data.status).toBe('IN_PROGRESS');
    expect(body.data.text).toBeUndefined();
  });

  test('poll returns COMPLETED with transcript', async () => {
    const service = new MockVoiceService();
    const handler = makeVoiceHandler(service);
    const start = await handler(
      makeEvent('/v1/voice/recognize', 'POST', {
        language: 'hi',
        audioBase64: validAudioBase64,
        mimeType: 'audio/webm',
      })
    );
    const jobId = JSON.parse(start.body).data.jobId;
    service.complete(jobId, 'ನಮಸ್ತೆ');

    const poll = await handler(makeEvent('/v1/voice/{jobId}', 'GET', undefined, { jobId }));
    expect(poll.statusCode).toBe(200);
    const body = JSON.parse(poll.body);
    expect(body.data.status).toBe('COMPLETED');
    expect(body.data.text).toBe('ನಮಸ್ತೆ');
  });

  test('poll returns FAILED for failed job', async () => {
    const service = new MockVoiceService();
    const handler = makeVoiceHandler(service);
    const start = await handler(
      makeEvent('/v1/voice/recognize', 'POST', {
        language: 'hi',
        audioBase64: validAudioBase64,
        mimeType: 'audio/webm',
      })
    );
    const jobId = JSON.parse(start.body).data.jobId;
    service.fail(jobId);

    const poll = await handler(makeEvent('/v1/voice/{jobId}', 'GET', undefined, { jobId }));
    expect(poll.statusCode).toBe(200);
    const body = JSON.parse(poll.body);
    expect(body.data.status).toBe('FAILED');
  });

  test('poll rejects missing jobId', async () => {
    const handler = makeVoiceHandler(new MockVoiceService());
    const result = await handler(makeEvent('/v1/voice/{jobId}', 'GET'));
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  test('poll rejects malformed jobId with path traversal', async () => {
    const handler = makeVoiceHandler(new MockVoiceService());
    const result = await handler(
      makeEvent('/v1/voice/{jobId}', 'GET', undefined, { jobId: '../../etc/passwd' })
    );
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  test('synthesize returns audio base64', async () => {
    const handler = makeVoiceHandler(new MockVoiceService());
    const result = await handler(
      makeEvent('/v1/voice/synthesize', 'POST', {
        language: 'hi',
        text: 'ನಮಸ್ತೆ',
      })
    );
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.ok).toBe(true);
    expect(body.data.audioBase64).toBe('mock-audio-base64');
    expect(body.data.contentType).toBe('audio/mpeg');
  });

  test('synthesize rejects unsupported language', async () => {
    const handler = makeVoiceHandler(new MockVoiceService());
    const result = await handler(
      makeEvent('/v1/voice/synthesize', 'POST', {
        language: 'kn',
        text: 'ನಮಸ್ತೆ',
      })
    );
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('UNSUPPORTED_LANGUAGE');
  });

  test('synthesize rejects oversized text', async () => {
    const handler = makeVoiceHandler(new MockVoiceService());
    const result = await handler(
      makeEvent('/v1/voice/synthesize', 'POST', {
        language: 'hi',
        text: 'a'.repeat(601),
      })
    );
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('TEXT_TOO_LONG');
  });

  test('common response envelope is preserved', async () => {
    const handler = makeVoiceHandler(new MockVoiceService());
    const result = await handler(
      makeEvent('/v1/voice/recognize', 'POST', {
        language: 'hi',
        audioBase64: validAudioBase64,
        mimeType: 'audio/webm',
      })
    );
    const body = JSON.parse(result.body);
    expect(body.requestId).toBe('req-voice-1');
    expect(typeof body.ok).toBe('boolean');
    expect(body.data).toBeDefined();
  });

  test('voice handler does not import or use Bedrock', async () => {
    const handlerSource = makeVoiceHandler.toString();
    expect(handlerSource).not.toContain('Bedrock');
    expect(handlerSource).not.toContain('InvokeModel');
    expect(handlerSource).not.toContain('Converse');
  });

  test('validateAudioInput enforces decoded audio size limit', () => {
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1, 1).toString('base64');
    const result = validateAudioInput('hi', oversized, 'audio/webm');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUDIO_TOO_LARGE');
    }
  });

  test('validateAudioInput accepts audio within size limit', () => {
    const ok = validateAudioInput('hi', validAudioBase64, 'audio/webm');
    expect(ok.ok).toBe(true);
  });
});
