import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { Scheme } from '../models/scheme.js';
import { validateScheme } from '../models/scheme.js';

export interface SchemeLookupResult {
  scheme: Scheme | null;
  malformed: boolean;
}

export interface SchemeStore {
  getActiveSchemes(): Promise<Scheme[]>;
  getSchemeById(schemeId: string): Promise<SchemeLookupResult>;
}

const TABLE_NAME = process.env.SCHEMES_TABLE ?? 'gramseva-schemes-dev';
const REGION = process.env.AWS_REGION ?? 'us-east-1';

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

export class DynamoDBSchemeStore implements SchemeStore {
  async getActiveSchemes(): Promise<Scheme[]> {
    const schemes: Scheme[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const response = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'active = :active',
          ExpressionAttributeValues: { ':active': true },
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      for (const item of response.Items ?? []) {
        const scheme = validateScheme(item);
        if (scheme) {
          schemes.push(scheme);
        }
      }

      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return schemes;
  }

  async getSchemeById(schemeId: string): Promise<SchemeLookupResult> {
    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { schemeId },
      })
    );

    if (!response.Item) {
      return { scheme: null, malformed: false };
    }

    const scheme = validateScheme(response.Item);
    if (!scheme) {
      return { scheme: null, malformed: true };
    }

    return { scheme, malformed: false };
  }
}

export class InMemorySchemeStore implements SchemeStore {
  constructor(private readonly schemes: Scheme[]) {}

  async getActiveSchemes(): Promise<Scheme[]> {
    return this.schemes.filter((s) => s.active);
  }

  async getSchemeById(schemeId: string): Promise<SchemeLookupResult> {
    const scheme = this.schemes.find((s) => s.schemeId === schemeId) ?? null;
    return { scheme, malformed: false };
  }
}

export function createSchemeStore(schemes?: Scheme[]): SchemeStore {
  if (schemes) {
    return new InMemorySchemeStore(schemes);
  }
  return new DynamoDBSchemeStore();
}
