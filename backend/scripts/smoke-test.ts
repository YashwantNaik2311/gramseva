const BASE_URL = 'https://0nfhw4y53g.execute-api.us-east-1.amazonaws.com/dev';

async function runSmokeTests() {
  console.log('=== LIVE DEV API SMOKE TESTS ===\n');

  // Test 1: GET /v1/health
  console.log('[SMOKE 1] Testing GET /v1/health');
  const healthRes = await fetch(`${BASE_URL}/v1/health`);
  const healthData = await healthRes.json() as any;
  console.log(`  Status: ${healthRes.status}, OK: ${healthData.ok}, Service: ${healthData.data?.service}, Version: ${healthData.data?.version}`);
  if (healthRes.status !== 200 || !healthData.ok) {
    throw new Error('Health check failed!');
  }

  // Test 2: GET /v1/schemes/{schemeId} for seeded schemes
  const testSchemes = ['pm-kisan', 'ka-gruha-lakshmi', 'ka-yuva-nidhi', 'nfshest', 'nsap-ignoaps'];
  for (const schemeId of testSchemes) {
    console.log(`\n[SMOKE 2] Testing GET /v1/schemes/${schemeId}`);
    const res = await fetch(`${BASE_URL}/v1/schemes/${schemeId}`);
    const data = await res.json() as any;
    console.log(`  Status: ${res.status}, Found: ${data.ok}, Name: "${data.data?.scheme?.name}"`);
    console.log(`  Official Source: ${data.data?.scheme?.officialSource}`);
    console.log(`  Category: [${data.data?.scheme?.category?.join(', ')}]`);
    if (res.status !== 200 || !data.ok || data.data?.scheme?.schemeId !== schemeId) {
      throw new Error(`Failed to fetch scheme detail for ${schemeId}`);
    }
  }

  // Test 3: POST /v1/recommendations with Persona 1 (Farmer in Karnataka)
  console.log('\n[SMOKE 3] Testing POST /v1/recommendations - Persona 1 (Farmer in Karnataka)');
  const persona1 = {
    language: 'en',
    rawText: 'I am a 42 year old male farmer in Karnataka with low income',
    attributes: {
      age: { status: 'provided', value: 42, confidence: 'high', sensitive: false },
      state: { status: 'provided', value: 'Karnataka', confidence: 'high', sensitive: false },
      occupation: { status: 'provided', value: 'farmer', confidence: 'high', sensitive: false },
      incomeBracket: { status: 'provided', value: 'low', confidence: 'high', sensitive: true },
      gender: { status: 'provided', value: 'male', confidence: 'high', sensitive: true },
      educationLevel: { status: 'unknown', value: null, confidence: null, sensitive: false },
      category: { status: 'unknown', value: null, confidence: null, sensitive: true },
      disability: { status: 'unknown', value: null, confidence: null, sensitive: true },
    }
  };

  const recRes1 = await fetch(`${BASE_URL}/v1/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(persona1)
  });
  const recData1 = await recRes1.json() as any;
  console.log(`  HTTP Status: ${recRes1.status}, OK: ${recData1.ok}`);
  const candidateIds1 = (recData1.data?.candidates || []).map((c: any) => c.schemeId);
  console.log(`  Candidate schemes returned (${candidateIds1.length}):`, candidateIds1);

  // Test 4: POST /v1/recommendations - Persona 3 (Woman worker in Karnataka, BPL)
  console.log('\n[SMOKE 4] Testing POST /v1/recommendations - Persona 3 (Woman worker in Karnataka, BPL)');
  const persona3 = {
    language: 'en',
    rawText: 'I am a 32 year old woman worker in Karnataka living below poverty line',
    attributes: {
      age: { status: 'provided', value: 32, confidence: 'high', sensitive: false },
      state: { status: 'provided', value: 'Karnataka', confidence: 'high', sensitive: false },
      occupation: { status: 'provided', value: 'worker', confidence: 'high', sensitive: false },
      incomeBracket: { status: 'provided', value: 'below_poverty_line', confidence: 'high', sensitive: true },
      gender: { status: 'provided', value: 'female', confidence: 'high', sensitive: true },
      educationLevel: { status: 'unknown', value: null, confidence: null, sensitive: false },
      category: { status: 'unknown', value: null, confidence: null, sensitive: true },
      disability: { status: 'unknown', value: null, confidence: null, sensitive: true },
    }
  };

  const recRes3 = await fetch(`${BASE_URL}/v1/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(persona3)
  });
  const recData3 = await recRes3.json() as any;
  console.log(`  HTTP Status: ${recRes3.status}, OK: ${recData3.ok}`);
  const candidateIds3 = (recData3.data?.candidates || []).map((c: any) => c.schemeId);
  console.log(`  Candidate schemes returned (${candidateIds3.length}):`, candidateIds3);

  // Test 5: POST /v1/recommendations - Persona 7 (Unemployed graduate in Karnataka)
  console.log('\n[SMOKE 5] Testing POST /v1/recommendations - Persona 7 (Unemployed graduate in Karnataka)');
  const persona7 = {
    language: 'en',
    rawText: 'I am 23 years old, unemployed graduate in Karnataka',
    attributes: {
      age: { status: 'provided', value: 23, confidence: 'high', sensitive: false },
      state: { status: 'provided', value: 'Karnataka', confidence: 'high', sensitive: false },
      occupation: { status: 'provided', value: 'unemployed', confidence: 'high', sensitive: false },
      educationLevel: { status: 'provided', value: 'undergraduate', confidence: 'high', sensitive: false },
      gender: { status: 'unknown', value: null, confidence: null, sensitive: true },
      incomeBracket: { status: 'unknown', value: null, confidence: null, sensitive: true },
      category: { status: 'unknown', value: null, confidence: null, sensitive: true },
      disability: { status: 'unknown', value: null, confidence: null, sensitive: true },
    }
  };

  const recRes7 = await fetch(`${BASE_URL}/v1/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(persona7)
  });
  const recData7 = await recRes7.json() as any;
  console.log(`  HTTP Status: ${recRes7.status}, OK: ${recData7.ok}`);
  const candidateIds7 = (recData7.data?.candidates || []).map((c: any) => c.schemeId);
  console.log(`  Candidate schemes returned (${candidateIds7.length}):`, candidateIds7);

  console.log('\n=== ALL LIVE SMOKE TESTS COMPLETED SUCCESSFULLY ===');
}

runSmokeTests().catch(err => {
  console.error('[SMOKE TEST ERROR]', err);
  process.exit(1);
});
