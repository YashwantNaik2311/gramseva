/**
 * Safe structured logger.
 * Never logs raw narratives, transcripts, audio, or sensitive profile values.
 */
const SENSITIVE_KEYS = new Set([
  'text',
  'narrative',
  'transcript',
  'audio',
  'audioBase64',
  'profile',
  'income',
  'incomeBracket',
  'category',
  'caste',
  'disability',
  'gender',
  'age',
  'state',
  'occupation',
]);

export interface LogContext extends Record<string, unknown> {
  requestId: string;
}

export function log(
  ctx: LogContext,
  level: 'info' | 'warn' | 'error',
  message: string,
  extra?: Record<string, unknown>
): void {
  const safeExtra: Record<string, unknown> = {};
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (SENSITIVE_KEYS.has(key)) continue;
      safeExtra[key] = value;
    }
  }
  console.log(
    JSON.stringify({
      requestId: ctx.requestId,
      level,
      message,
      timestamp: new Date().toISOString(),
      ...safeExtra,
    })
  );
}
