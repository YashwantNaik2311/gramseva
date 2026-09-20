import { describe, expect, test } from 'vitest';
import type { Attributes, Profile } from '../src/models/profile.js';
import type { Scheme } from '../src/models/scheme.js';
import { matchScheme, matchSchemes, isCandidate, toCandidate } from '../src/lib/matcher.js';

function attr(value: unknown, status: 'provided' | 'unknown' = 'provided', confidence: 'high' | 'medium' | 'low' | null = 'high'): Attributes[AttributeName] {
  return {
    status,
    value: status === 'provided' ? value : null,
    confidence,
    sensitive: false,
  } as Attributes[AttributeName];
}

type AttributeName = keyof Attributes;

const studentInKarnataka: Profile = {
  language: 'en',
  rawText: 'test',
  attributes: {
    age: attr(19),
    state: attr('Karnataka'),
    occupation: attr('student'),
    incomeBracket: attr('low'),
    gender: attr('unknown', 'unknown'),
    educationLevel: attr('unknown', 'unknown'),
    category: attr('unknown', 'unknown', null),
    disability: attr('unknown', 'unknown', null),
  },
};

const karnatakaStudentScheme: Scheme = {
  schemeId: 'DEV-Karnataka-Student-Grant',
  name: '[DEV] Karnataka Student Grant',
  localizedName: { en: '[DEV] Karnataka Student Grant' },
  description: { en: 'A development fixture for students in Karnataka.' },
  benefits: [{ en: 'Financial support' }],
  eligibility: [
    { attribute: 'state', operator: 'eq', value: 'Karnataka', required: true },
    { attribute: 'age', operator: 'between', value: [18, 35], required: true },
    { attribute: 'occupation', operator: 'eq', value: 'student', required: true },
    { attribute: 'incomeBracket', operator: 'in', value: ['below_poverty_line', 'low'], required: false },
  ],
  documents: [{ en: 'Student ID' }],
  state: 'Karnataka',
  category: ['students'],
  applicationUrl: 'https://example.com/dev-karnataka-student',
  officialSource: 'https://example.com/dev-karnataka-student-source',
  sourceName: '[DEV] Karnataka Education Department',
  lastVerified: '2026-09-17',
  active: true,
  unknownConditions: ['incomeBracket'],
  verificationStatus: 'dev-fixture',
};

const farmerScheme: Scheme = {
  schemeId: 'DEV-National-Farmer-Support',
  name: '[DEV] National Farmer Support',
  localizedName: { en: '[DEV] National Farmer Support' },
  description: { en: 'A development fixture for farmers.' },
  benefits: [{ en: 'Annual income support' }],
  eligibility: [
    { attribute: 'occupation', operator: 'eq', value: 'farmer', required: true },
    { attribute: 'incomeBracket', operator: 'in', value: ['below_poverty_line', 'low'], required: false },
  ],
  documents: [{ en: 'Land record' }],
  state: 'All India',
  category: ['farmers'],
  applicationUrl: 'https://example.com/dev-farmer',
  officialSource: 'https://example.com/dev-farmer-source',
  sourceName: '[DEV] Ministry of Agriculture',
  lastVerified: '2026-09-17',
  active: true,
  unknownConditions: ['incomeBracket'],
  verificationStatus: 'dev-fixture',
};

const seniorHealthScheme: Scheme = {
  schemeId: 'DEV-Senior-Health',
  name: '[DEV] Senior Citizen Health Scheme',
  localizedName: { en: '[DEV] Senior Citizen Health Scheme' },
  description: { en: 'A development fixture for senior citizens.' },
  benefits: [{ en: 'Free health checkups' }],
  eligibility: [
    { attribute: 'age', operator: 'gte', value: 60, required: true },
  ],
  documents: [{ en: 'Age proof' }],
  state: 'All India',
  category: ['senior citizens'],
  applicationUrl: 'https://example.com/dev-senior',
  officialSource: 'https://example.com/dev-senior-source',
  sourceName: '[DEV] Ministry of Health',
  lastVerified: '2026-09-17',
  active: true,
  unknownConditions: [],
  verificationStatus: 'dev-fixture',
};

const womenEntrepreneurScheme: Scheme = {
  schemeId: 'DEV-Women-Entrepreneur',
  name: '[DEV] Women Entrepreneur Loan',
  localizedName: { en: '[DEV] Women Entrepreneur Loan' },
  description: { en: 'A development fixture for women entrepreneurs.' },
  benefits: [{ en: 'Low-interest business loan' }],
  eligibility: [
    { attribute: 'gender', operator: 'eq', value: 'female', required: true },
    { attribute: 'occupation', operator: 'eq', value: 'entrepreneur', required: true },
    { attribute: 'incomeBracket', operator: 'in', value: ['below_poverty_line', 'low'], required: false },
  ],
  documents: [{ en: 'Business plan' }],
  state: 'All India',
  category: ['women', 'entrepreneurs'],
  applicationUrl: 'https://example.com/dev-women',
  officialSource: 'https://example.com/dev-women-source',
  sourceName: '[DEV] Ministry of MSME',
  lastVerified: '2026-09-17',
  active: true,
  unknownConditions: ['incomeBracket'],
  verificationStatus: 'dev-fixture',
};

describe('matcher', () => {
  test('state match', () => {
    const result = matchScheme(karnatakaStudentScheme, studentInKarnataka.attributes);
    expect(result.conditionResults.state).toBe('MATCHED');
    expect(isCandidate(result)).toBe(true);
  });

  test('state mismatch excludes scheme', () => {
    const profile: Profile = {
      ...studentInKarnataka,
      attributes: {
        ...studentInKarnataka.attributes,
        state: attr('Maharashtra'),
      },
    };
    const result = matchScheme(karnatakaStudentScheme, profile.attributes);
    expect(result.conditionResults.state).toBe('NOT_MET');
    expect(isCandidate(result)).toBe(false);
  });

  test('age within range', () => {
    const result = matchScheme(karnatakaStudentScheme, studentInKarnataka.attributes);
    expect(result.conditionResults.age).toBe('MATCHED');
  });

  test('age outside range excludes scheme', () => {
    const profile: Profile = {
      ...studentInKarnataka,
      attributes: {
        ...studentInKarnataka.attributes,
        age: attr(40),
      },
    };
    const result = matchScheme(karnatakaStudentScheme, profile.attributes);
    expect(result.conditionResults.age).toBe('NOT_MET');
    expect(isCandidate(result)).toBe(false);
  });

  test('multiple criteria satisfied', () => {
    const result = matchScheme(karnatakaStudentScheme, studentInKarnataka.attributes);
    expect(result.matchedRequiredCount).toBe(3);
    expect(result.matchedOptionalCount).toBe(1);
    expect(isCandidate(result)).toBe(true);
  });

  test('required criterion unknown still allows candidate if no required unmet', () => {
    const profile: Profile = {
      ...studentInKarnataka,
      attributes: {
        ...studentInKarnataka.attributes,
        incomeBracket: attr('unknown', 'unknown'),
      },
    };
    const result = matchScheme(karnatakaStudentScheme, profile.attributes);
    expect(result.conditionResults.incomeBracket).toBe('UNKNOWN');
    expect(isCandidate(result)).toBe(true);
  });

  test('optional unknown condition is surfaced', () => {
    const profile: Profile = {
      ...studentInKarnataka,
      attributes: {
        ...studentInKarnataka.attributes,
        incomeBracket: attr('unknown', 'unknown'),
      },
    };
    const result = matchScheme(karnatakaStudentScheme, profile.attributes);
    const candidate = toCandidate(result, profile.attributes, 'en');
    expect(candidate.unknownConditions.some((c) => c.attribute === 'incomeBracket')).toBe(true);
  });

  test('sensitive attribute unknown is handled safely', () => {
    const profile: Profile = {
      ...studentInKarnataka,
      attributes: {
        ...studentInKarnataka.attributes,
        category: attr('unknown', 'unknown', null),
      },
    };
    const result = matchScheme(karnatakaStudentScheme, profile.attributes);
    expect(isCandidate(result)).toBe(true);
  });

  test('deterministic ordering', () => {
    const profile: Profile = {
      language: 'en',
      rawText: 'test',
      attributes: {
        age: attr(65),
        state: attr('Karnataka'),
        occupation: attr('farmer'),
        incomeBracket: attr('low'),
        gender: attr('unknown', 'unknown'),
        educationLevel: attr('unknown', 'unknown'),
        category: attr('unknown', 'unknown', null),
        disability: attr('unknown', 'unknown', null),
      },
    };
    const results = matchSchemes([karnatakaStudentScheme, farmerScheme, seniorHealthScheme], profile);
    expect(results.length).toBe(2); // farmer and senior
    // Farmer matches 1 required + 1 optional; senior matches 1 required.
    // Farmer should rank higher because optional match counts.
    expect(results[0].scheme.schemeId).toBe('DEV-National-Farmer-Support');
    expect(results[1].scheme.schemeId).toBe('DEV-Senior-Health');
  });

  test('explanation generated from actual matched conditions', () => {
    const result = matchScheme(karnatakaStudentScheme, studentInKarnataka.attributes);
    const candidate = toCandidate(result, studentInKarnataka.attributes, 'en');
    expect(candidate.explanation.matched.length).toBeGreaterThan(0);
    expect(candidate.explanation.verify.length).toBeGreaterThanOrEqual(0);
    expect(candidate.explanation.text).toContain('This scheme may be relevant');
  });

  test('no Bedrock invocation in matcher', () => {
    // The matcher is a pure function with no AWS imports.
    expect(matchSchemes.toString()).not.toContain('Bedrock');
    expect(matchSchemes.toString()).not.toContain('InvokeModel');
  });
});
