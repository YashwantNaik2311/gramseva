/**
 * Seed script for the GramSeva DynamoDB schemes table.
 *
 * Reads production-verified schemes from dataset/schemes.json,
 * validates every record against SchemeSchema before any writes,
 * and performs idempotent upserts into gramseva-schemes-{stage}.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SchemeSchema, type Scheme } from '../src/models/scheme.js';

// Determine stage and table
const args = process.argv.slice(2);
let stage = process.env.STAGE ?? 'dev';
if (args.includes('--prod')) {
  stage = 'prod';
} else {
  const stageIdx = args.indexOf('--stage');
  if (stageIdx !== -1 && args[stageIdx + 1]) {
    stage = args[stageIdx + 1];
  }
}

const region = process.env.AWS_REGION ?? 'us-east-1';
const tableName = process.env.SCHEMES_TABLE ?? `gramseva-schemes-${stage}`;

const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client);

async function runSeed(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const datasetPath = path.resolve(__dirname, '../../dataset/schemes.json');

  console.log(`[SEED] Reading schemes from: ${datasetPath}`);
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Dataset file not found at: ${datasetPath}`);
  }

  const rawData = fs.readFileSync(datasetPath, 'utf8');
  let rawSchemes: unknown[];
  try {
    rawSchemes = JSON.parse(rawData);
  } catch (err) {
    throw new Error(`Failed to parse dataset JSON: ${(err as Error).message}`);
  }

  if (!Array.isArray(rawSchemes)) {
    throw new Error('Dataset root must be a JSON array of scheme objects.');
  }

  console.log(`[SEED] Validating ${rawSchemes.length} schemes against SchemeSchema...`);

  const validatedSchemes: Scheme[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < rawSchemes.length; i++) {
    const raw = rawSchemes[i];
    const parseResult = SchemeSchema.safeParse(raw);
    if (!parseResult.success) {
      console.error(`[SEED ERROR] Validation failed for scheme at index ${i}:`, parseResult.error.format());
      throw new Error(`Validation failed for scheme index ${i} (${(raw as Record<string, unknown>)?.schemeId ?? 'unknown ID'})`);
    }

    const scheme = parseResult.data;
    if (seenIds.has(scheme.schemeId)) {
      throw new Error(`Duplicate schemeId found in dataset: "${scheme.schemeId}"`);
    }
    seenIds.add(scheme.schemeId);
    validatedSchemes.push(scheme);
  }

  console.log(`[SEED] Validation passed: all ${validatedSchemes.length} schemes strictly conform to SchemeSchema.`);
  console.log(`[SEED] Target DynamoDB table: "${tableName}" (region: ${region}, stage: ${stage})`);

  let writtenCount = 0;
  for (const scheme of validatedSchemes) {
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: scheme,
      })
    );
    writtenCount++;
    console.log(`  [+] (${writtenCount}/${validatedSchemes.length}) Seeded: ${scheme.schemeId} [${scheme.name}]`);
  }

  console.log(`\n[SEED SUCCESS] Successfully seeded ${writtenCount} schemes to "${tableName}".`);
}

runSeed().catch((err) => {
  console.error('[SEED FATAL]', err.message);
  process.exit(1);
});
