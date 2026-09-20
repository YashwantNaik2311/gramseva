import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  type LanguageCode as TranscribeLanguageCode,
  type MediaFormat,
} from '@aws-sdk/client-transcribe';
import { PollyClient, SynthesizeSpeechCommand, type VoiceId, type LanguageCode as PollyLanguageCode } from '@aws-sdk/client-polly';

const REGION = process.env.AWS_REGION ?? 'us-east-1';
const AUDIO_BUCKET = process.env.AUDIO_BUCKET ?? '';

const TRANSCRIBE_LANGUAGE_CODES: Record<string, string> = {
  hi: 'hi-IN',
  kn: 'kn-IN',
  en: 'en-US',
};

const POLLY_VOICES: Record<string, { languageCode: string; voiceId: VoiceId }> = {
  hi: { languageCode: 'hi-IN', voiceId: 'Aditi' },
  en: { languageCode: 'en-US', voiceId: 'Joanna' },
};

const MIME_TO_MEDIA_FORMAT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp3': 'mp3',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/x-m4a': 'mp4',
};

const MIME_TO_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp3': 'mp3',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
};

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const MAX_SYNTHESIS_CHARS = 600;

export interface RecognitionStartResult {
  jobId: string;
}

export interface RecognitionResult {
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  text?: string;
  languageCode?: string;
}

export interface SynthesisResult {
  audioBase64: string;
  contentType: string;
}

export interface VoiceService {
  startRecognition(language: string, audioBase64: string, mimeType: string): Promise<RecognitionStartResult>;
  getRecognitionResult(jobId: string): Promise<RecognitionResult>;
  synthesize(language: string, text: string): Promise<SynthesisResult>;
}

export function getTranscribeLanguageCode(language: string): string | null {
  return TRANSCRIBE_LANGUAGE_CODES[language] ?? null;
}

export function getPollyVoice(language: string): { languageCode: string; voiceId: VoiceId } | null {
  return POLLY_VOICES[language] ?? null;
}

export function getMediaFormat(mimeType: string): string | null {
  return MIME_TO_MEDIA_FORMAT[mimeType] ?? null;
}

export function validateAudioInput(
  language: string,
  audioBase64: string,
  mimeType: string
): { ok: true } | { ok: false; code: string; message: string } {
  if (!TRANSCRIBE_LANGUAGE_CODES[language]) {
    return { ok: false, code: 'UNSUPPORTED_LANGUAGE', message: 'Language not supported for voice recognition' };
  }
  if (!mimeType || !MIME_TO_MEDIA_FORMAT[mimeType]) {
    return { ok: false, code: 'UNSUPPORTED_AUDIO_FORMAT', message: 'Audio format not supported' };
  }
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return { ok: false, code: 'INVALID_INPUT', message: 'audioBase64 is required' };
  }
  try {
    const buffer = Buffer.from(audioBase64, 'base64');
    if (buffer.length === 0) {
      return { ok: false, code: 'INVALID_INPUT', message: 'audioBase64 is empty' };
    }
    if (buffer.length > MAX_AUDIO_BYTES) {
      return { ok: false, code: 'AUDIO_TOO_LARGE', message: 'Audio file too large' };
    }
  } catch {
    return { ok: false, code: 'INVALID_INPUT', message: 'audioBase64 is not valid base64' };
  }
  return { ok: true };
}

export function validateSynthesisInput(
  language: string,
  text: string
): { ok: true } | { ok: false; code: string; message: string } {
  if (!POLLY_VOICES[language]) {
    return { ok: false, code: 'UNSUPPORTED_LANGUAGE', message: 'Language not supported for voice synthesis' };
  }
  if (!text || typeof text !== 'string') {
    return { ok: false, code: 'INVALID_INPUT', message: 'text is required' };
  }
  if (text.length > MAX_SYNTHESIS_CHARS) {
    return { ok: false, code: 'TEXT_TOO_LONG', message: 'Text too long' };
  }
  return { ok: true };
}

class AWSVoiceService implements VoiceService {
  private s3 = new S3Client({ region: REGION });
  private transcribe = new TranscribeClient({ region: REGION });
  private polly = new PollyClient({ region: REGION });

  async startRecognition(language: string, audioBase64: string, mimeType: string): Promise<RecognitionStartResult> {
    const jobId = `gramseva-${crypto.randomUUID()}`;
    const ext = MIME_TO_EXT[mimeType] ?? 'webm';
    const key = `uploads/${jobId}.${ext}`;
    const mediaFormat = MIME_TO_MEDIA_FORMAT[mimeType] ?? 'webm';
    const languageCode = TRANSCRIBE_LANGUAGE_CODES[language];

    const buffer = Buffer.from(audioBase64, 'base64');
    await this.s3.send(
      new PutObjectCommand({
        Bucket: AUDIO_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    await this.transcribe.send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: jobId,
        LanguageCode: languageCode as TranscribeLanguageCode,
        MediaFormat: mediaFormat as MediaFormat,
        Media: { MediaFileUri: `s3://${AUDIO_BUCKET}/${key}` },
        OutputBucketName: AUDIO_BUCKET,
      })
    );

    return { jobId };
  }

  async getRecognitionResult(jobId: string): Promise<RecognitionResult> {
    const response = await this.transcribe.send(
      new GetTranscriptionJobCommand({
        TranscriptionJobName: jobId,
      })
    );
    const job = response.TranscriptionJob;
    const status = job?.TranscriptionJobStatus;

    if (status === 'IN_PROGRESS' || status === 'QUEUED') {
      return { status: 'IN_PROGRESS' };
    }

    if (status === 'FAILED') {
      return { status: 'FAILED' };
    }

    if (status === 'COMPLETED') {
      const s3Response = await this.s3.send(
        new GetObjectCommand({
          Bucket: AUDIO_BUCKET,
          Key: `${jobId}.json`,
        })
      );
      const body = await s3Response.Body?.transformToString();
      if (!body) {
        return { status: 'FAILED' };
      }
      const transcriptJson = JSON.parse(body);
      const text = transcriptJson.results?.transcripts?.[0]?.transcript ?? '';
      return { status: 'COMPLETED', text, languageCode: job?.LanguageCode };
    }

    return { status: 'FAILED' };
  }

  async synthesize(language: string, text: string): Promise<SynthesisResult> {
    const voice = POLLY_VOICES[language];
    const response = await this.polly.send(
      new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: 'mp3',
        VoiceId: voice.voiceId,
        LanguageCode: voice.languageCode as PollyLanguageCode,
      })
    );
    const bytes = await response.AudioStream?.transformToByteArray();
    if (!bytes) {
      throw new Error('Polly returned empty audio stream');
    }
    return {
      audioBase64: Buffer.from(bytes).toString('base64'),
      contentType: 'audio/mpeg',
    };
  }
}

export class MockVoiceService implements VoiceService {
  private jobs: Record<
    string,
    { status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'; text?: string; languageCode?: string }
  > = {};

  async startRecognition(language: string, _audioBase64: string, _mimeType: string): Promise<RecognitionStartResult> {
    const jobId = `mock-${crypto.randomUUID()}`;
    this.jobs[jobId] = { status: 'IN_PROGRESS', languageCode: language };
    return { jobId };
  }

  async getRecognitionResult(jobId: string): Promise<RecognitionResult> {
    const job = this.jobs[jobId];
    if (!job) {
      return { status: 'FAILED' };
    }
    if (job.status === 'COMPLETED') {
      return { status: 'COMPLETED', text: job.text ?? 'mock transcript', languageCode: job.languageCode };
    }
    return { status: job.status };
  }

  async synthesize(_language: string, _text: string): Promise<SynthesisResult> {
    return { audioBase64: 'mock-audio-base64', contentType: 'audio/mpeg' };
  }

  complete(jobId: string, text: string): void {
    const job = this.jobs[jobId];
    if (job) {
      job.status = 'COMPLETED';
      job.text = text;
    }
  }

  fail(jobId: string): void {
    const job = this.jobs[jobId];
    if (job) {
      job.status = 'FAILED';
    }
  }
}

export function createVoiceService(): VoiceService {
  return new AWSVoiceService();
}
