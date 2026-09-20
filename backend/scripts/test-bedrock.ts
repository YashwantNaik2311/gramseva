/**
 * Opt-in live integration test for the Bedrock Mantle + DeepSeek v3.2 path.
 *
 * Requires BEDROCK_API_KEY to be set in the environment. It makes one tiny
 * extraction request; it does NOT run as part of `npm test`.
 *
 * Usage:
 *   BEDROCK_API_KEY=... npm run test:bedrock
 */
import { DeepSeekMantleExtractor } from '../src/services/extractor.js';

async function main(): Promise<void> {
  const apiKey = process.env.BEDROCK_API_KEY;
  if (!apiKey) {
    console.error('BEDROCK_API_KEY is not set. Provide it as an environment variable to run this test.');
    process.exit(1);
  }

  const extractor = new DeepSeekMantleExtractor({ apiKey });

  const started = Date.now();
  const profile = await extractor.extract({
    language: 'en',
    text: 'I am 24 years old and live in Karnataka. I am a farmer. My family earns about 1.5 lakh rupees per year.',
  });

  const latencyMs = Date.now() - started;

  console.log('OK: live DeepSeek extraction succeeded');
  console.log(`latencyMs: ${latencyMs}`);
  console.log(`language: ${profile.language}`);
  for (const [name, attr] of Object.entries(profile.attributes)) {
    const value = attr.status === 'provided' ? String(attr.value) : 'unknown';
    console.log(`${name}: ${value}`);
  }
}

main().catch((err) => {
  console.error('FAIL: live DeepSeek extraction failed');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
