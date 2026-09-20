import type { APIGatewayProxyResult } from 'aws-lambda';

export interface ApiResponse<T = unknown> {
  requestId: string;
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export function success<T>(requestId: string, data: T, statusCode = 200): APIGatewayProxyResult {
  const body: ApiResponse<T> = { requestId, ok: true, data };
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function failure(
  requestId: string,
  statusCode: number,
  code: string,
  message: string
): APIGatewayProxyResult {
  const body: ApiResponse<never> = { requestId, ok: false, error: { code, message } };
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function getRequestId(event: { headers?: Record<string, string | undefined> }): string {
  return event.headers?.['x-request-id'] ?? event.headers?.['X-Request-Id'] ?? crypto.randomUUID();
}
