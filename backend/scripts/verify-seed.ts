import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SchemeSchema, type Scheme } from '../src/models/scheme.js';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function verify() {
  console.log('=== DynamoDB Read-Back Verification ===');
  const response = await docClient.send(new ScanCommand({
    TableName: 'gramseva-schemes-dev',
    FilterExpression: 'active = :active',
    ExpressionAttributeValues: { ':active': true }
  }));

  const items = response.Items || [];
  console.log('Total active items scanned from DynamoDB:', items.length);

  // Filter for production schemes (excluding legacy dev-fixtures if any)
  const prodSchemes = items.filter(i => i.verificationStatus !== 'dev-fixture') as Scheme[];
  console.log('Active production schemes found:', prodSchemes.length);

  // Validate every scheme against SchemeSchema
  for (const s of prodSchemes) {
    const res = SchemeSchema.safeParse(s);
    if (!res.success) {
      throw new Error(`Scheme failed SchemeSchema validation: ${s.schemeId}`);
    }
  }
  console.log(`[CHECK 1] All ${prodSchemes.length} schemes passed SchemeSchema validation: PASS`);

  // Check count == 18
  if (prodSchemes.length !== 18) {
    throw new Error(`Expected 18 active production schemes, got ${prodSchemes.length}`);
  }
  console.log('[CHECK 2] Exactly 18 active schemes confirmed: PASS');

  const schemeMap = new Map(prodSchemes.map(s => [s.schemeId, s]));

  // Confirm pm-yasasvi is absent
  const hasYasasvi = schemeMap.has('pm-yasasvi');
  if (hasYasasvi) throw new Error('pm-yasasvi must be absent!');
  console.log('[CHECK 3] pm-yasasvi is absent: PASS');

  // Confirm nfshest uses tribal.gov.in
  const nfshest = schemeMap.get('nfshest');
  if (!nfshest || nfshest.officialSource !== 'https://tribal.gov.in') {
    throw new Error(`nfshest officialSource is not https://tribal.gov.in: ${nfshest?.officialSource}`);
  }
  console.log(`[CHECK 4] nfshest uses https://tribal.gov.in: PASS (${nfshest.officialSource})`);

  // Confirm nsap-ignoaps uses nsap.dord.gov.in
  const ignoaps = schemeMap.get('nsap-ignoaps');
  if (!ignoaps || ignoaps.officialSource !== 'https://nsap.dord.gov.in') {
    throw new Error(`nsap-ignoaps officialSource is not https://nsap.dord.gov.in: ${ignoaps?.officialSource}`);
  }
  console.log(`[CHECK 5] nsap-ignoaps uses https://nsap.dord.gov.in: PASS (${ignoaps.officialSource})`);

  // Confirm pm-kmy contains enrollment-status caveat
  const pmkmy = schemeMap.get('pm-kmy');
  const hasKmyCaveat = pmkmy?.unknownConditions?.some(c => c.includes('Common Service Centres') || c.includes('Maandhan portal'));
  if (!hasKmyCaveat) throw new Error('pm-kmy missing enrollment caveat!');
  console.log('[CHECK 6] pm-kmy contains enrollment-status caveat: PASS');

  // Confirm ab-pmjay contains 70+ caveat
  const pmjay = schemeMap.get('ab-pmjay');
  const hasPmjayCaveat = pmjay?.unknownConditions?.some(c => c.includes('70 and above') || c.includes('Ayushman Vay Vandana'));
  if (!hasPmjayCaveat) throw new Error('ab-pmjay missing 70+ caveat!');
  console.log('[CHECK 7] ab-pmjay contains 70+ Ayushman Vay Vandana caveat: PASS');

  // Confirm ka-gruha-lakshmi contains current-operation/re-verification caveat
  const gruha = schemeMap.get('ka-gruha-lakshmi');
  const hasGruhaCaveat = gruha?.unknownConditions?.some(c => c.includes('operational') || c.includes('re-verification'));
  if (!hasGruhaCaveat) throw new Error('ka-gruha-lakshmi missing re-verification caveat!');
  console.log('[CHECK 8] ka-gruha-lakshmi contains current-operation/re-verification caveat: PASS');

  // Confirm ka-yuva-nidhi retains 2022-23-or-later cohort requirement
  const yuva = schemeMap.get('ka-yuva-nidhi');
  const hasYuvaCohort = yuva?.unknownConditions?.some(c => c.includes('2022-23 or later'));
  if (!hasYuvaCohort) throw new Error('ka-yuva-nidhi missing 2022-23 or later cohort requirement!');
  console.log('[CHECK 9] ka-yuva-nidhi retains 2022-23 or later cohort requirement: PASS');

  console.log('\n=== ALL 9 READ-BACK VERIFICATION CHECKS PASSED ===');
}

verify().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
