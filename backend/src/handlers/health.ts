import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { failure, getRequestId, success } from '../lib/response.js';
import { log } from '../utils/logger.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = getRequestId(event);
  try {
    log({ requestId }, 'info', 'health check');
    return success(requestId, { status: 'ok', service: 'gramseva', version: '0.1.0' });
  } catch (err) {
    log({ requestId }, 'error', 'health check failed', {
      errorType: err instanceof Error ? err.name : 'Unknown',
    });
    return failure(requestId, 500, 'INTERNAL_ERROR', 'Health check failed');
  }
};
