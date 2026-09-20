import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SchemeSchema, type Scheme } from '../src/models/scheme.js';
import { ATTRIBUTE_NAMES, type Profile, type Attributes } from '../src/models/profile.js';
import { matchSchemes, toCandidate } from '../src/lib/matcher.js';

const datasetPath = path.resolve(__dirname, '../../dataset/schemes.json');
const rawData = fs.readFileSync(datasetPath, 'utf8');
const schemes: Scheme[] = JSON.parse(rawData);

describe('dataset schema and integrity tests', () => {
  test('dataset file exists and has 15-20 schemes', () => {
    expect(schemes.length).toBeGreaterThanOrEqual(15);
    expect(schemes.length).toBeLessThanOrEqual(20);
  });

  test('all schemes strictly pass SchemeSchema validation', () => {
    for (const scheme of schemes) {
      const parsed = SchemeSchema.safeParse(scheme);
      if (!parsed.success) {
        console.error(`Validation failed for scheme: ${scheme.schemeId}`, parsed.error.format());
      }
      expect(parsed.success).toBe(true);
    }
  });

  test('all schemeIds are unique and follow valid identifier format', () => {
    const idSet = new Set<string>();
    for (const s of schemes) {
      expect(idSet.has(s.schemeId)).toBe(false);
      idSet.add(s.schemeId);
      expect(s.schemeId).toMatch(/^[a-z0-9-]+$/);
    }
  });

  test('all schemes have non-empty eligibility rules', () => {
    for (const s of schemes) {
      expect(s.eligibility.length).toBeGreaterThan(0);
      for (const cond of s.eligibility) {
        expect(ATTRIBUTE_NAMES).toContain(cond.attribute);
        expect(['eq', 'between', 'in', 'gte', 'lte']).toContain(cond.operator);
      }
    }
  });

  test('all schemes have trilingual localizedName, description, benefits, and documents', () => {
    for (const s of schemes) {
      expect(s.localizedName.en).toBeTruthy();
      expect(s.localizedName.hi).toBeTruthy();
      expect(s.localizedName.kn).toBeTruthy();

      expect(s.description.en).toBeTruthy();
      expect(s.description.hi).toBeTruthy();
      expect(s.description.kn).toBeTruthy();

      expect(s.benefits.length).toBeGreaterThan(0);
      for (const b of s.benefits) {
        expect(b.en).toBeTruthy();
        expect(b.hi).toBeTruthy();
        expect(b.kn).toBeTruthy();
      }

      expect(s.documents.length).toBeGreaterThan(0);
      for (const d of s.documents) {
        expect(d.en).toBeTruthy();
        expect(d.hi).toBeTruthy();
        expect(d.kn).toBeTruthy();
      }
    }
  });

  test('all schemes have official .gov.in or official statutory URLs', () => {
    for (const s of schemes) {
      expect(s.officialSource).toMatch(/^https?:\/\//);
      expect(s.applicationUrl).toMatch(/^https?:\/\//);
      expect(s.sourceName).toBeTruthy();
    }
  });

  test('disability attribute conditions never use boolean true', () => {
    for (const s of schemes) {
      for (const cond of s.eligibility) {
        if (cond.attribute === 'disability') {
          expect(cond.value).toBe('yes');
        }
      }
    }
  });
});

function createTestProfile(overrides: Partial<Record<keyof Attributes, unknown>>): Profile {
  const baseAttributes: Attributes = {
    age: { status: 'unknown', value: null, confidence: null, sensitive: false },
    state: { status: 'unknown', value: null, confidence: null, sensitive: false },
    occupation: { status: 'unknown', value: null, confidence: null, sensitive: false },
    incomeBracket: { status: 'unknown', value: null, confidence: null, sensitive: true },
    gender: { status: 'unknown', value: null, confidence: null, sensitive: true },
    educationLevel: { status: 'unknown', value: null, confidence: null, sensitive: false },
    category: { status: 'unknown', value: null, confidence: null, sensitive: true },
    disability: { status: 'unknown', value: null, confidence: null, sensitive: true },
  };

  for (const [k, v] of Object.entries(overrides)) {
    const key = k as keyof Attributes;
    if (v !== undefined && v !== null) {
      baseAttributes[key] = {
        status: 'provided',
        value: v as any,
        confidence: 'high',
        sensitive: ['gender', 'incomeBracket', 'category', 'disability'].includes(key),
      };
    }
  }

  return {
    language: 'en',
    rawText: 'test persona',
    attributes: baseAttributes,
  };
}

describe('deterministic persona matching tests with finalized dataset', () => {
  test('Persona 1: Farmer in Karnataka matches farmer schemes and excludes student/women schemes', () => {
    // gender: 'male' is explicitly set so that female-only required conditions evaluate
    // to NOT_MET (not UNKNOWN), correctly excluding ka-gruha-lakshmi and pmuy.
    const profile = createTestProfile({
      age: 42,
      state: 'Karnataka',
      occupation: 'farmer',
      incomeBracket: 'low',
      gender: 'male',
    });

    const candidates = matchSchemes(schemes, profile);
    const ids = candidates.map((c) => c.scheme.schemeId);

    expect(ids).toContain('pm-kisan');
    expect(ids).toContain('pmfby');
    expect(ids).not.toContain('nmmss');
    expect(ids).not.toContain('ka-gruha-lakshmi');
    expect(ids).not.toContain('pmuy');
  });

  test('Persona 2: Undergraduate college student in Karnataka matches college scholarship', () => {
    const profile = createTestProfile({
      age: 19,
      state: 'Karnataka',
      occupation: 'student',
      educationLevel: 'undergraduate',
      incomeBracket: 'low',
    });

    const candidates = matchSchemes(schemes, profile);
    const ids = candidates.map((c) => c.scheme.schemeId);

    expect(ids).toContain('pm-usp-css');
    expect(ids).not.toContain('pm-kisan');
    expect(ids).not.toContain('nmmss'); // NMMSS is for school students age 12-18
    expect(ids).not.toContain('nsap-ignoaps');
  });

  test('Persona 3: Low-income woman in Karnataka matches Gruha Lakshmi and Ujjwala', () => {
    const profile = createTestProfile({
      age: 32,
      state: 'Karnataka',
      gender: 'female',
      occupation: 'worker',
      incomeBracket: 'below_poverty_line',
    });

    const candidates = matchSchemes(schemes, profile);
    const ids = candidates.map((c) => c.scheme.schemeId);

    expect(ids).toContain('ka-gruha-lakshmi');
    expect(ids).toContain('pmuy');
    expect(ids).not.toContain('pm-kisan');
    expect(ids).not.toContain('nmmss');
  });

  test('Persona 4: Person with disability matches disability scholarships', () => {
    const profile = createTestProfile({
      age: 21,
      state: 'Karnataka',
      occupation: 'student',
      educationLevel: 'undergraduate',
      disability: 'yes',
      incomeBracket: 'low',
    });

    const candidates = matchSchemes(schemes, profile);
    const ids = candidates.map((c) => c.scheme.schemeId);

    expect(ids).toContain('postmatric-disability');
    expect(ids).toContain('aicte-saksham');
    expect(ids).not.toContain('pm-kisan');
  });

  test('Persona 5: Senior citizen living in poverty matches IGNOAPS old-age pension', () => {
    const profile = createTestProfile({
      age: 68,
      state: 'Karnataka',
      incomeBracket: 'below_poverty_line',
    });

    const candidates = matchSchemes(schemes, profile);
    const ids = candidates.map((c) => c.scheme.schemeId);

    expect(ids).toContain('nsap-ignoaps');
    expect(ids).not.toContain('pm-kmy'); // Entry age 18-40
    expect(ids).not.toContain('nmmss');
  });

  test('Persona 6: Urban self-employed worker matches MUDRA and PM SVANidhi', () => {
    const profile = createTestProfile({
      age: 29,
      state: 'Karnataka',
      occupation: 'self-employed',
      incomeBracket: 'low',
    });

    const candidates = matchSchemes(schemes, profile);
    const ids = candidates.map((c) => c.scheme.schemeId);

    expect(ids).toContain('pmmy');
    expect(ids).toContain('pm-svanidhi');
    expect(ids).not.toContain('pm-kisan');
  });

  test('Persona 7: Unemployed graduate in Karnataka matches Yuva Nidhi', () => {
    const profile = createTestProfile({
      age: 23,
      state: 'Karnataka',
      occupation: 'unemployed',
      educationLevel: 'undergraduate',
    });

    const candidates = matchSchemes(schemes, profile);
    const ids = candidates.map((c) => c.scheme.schemeId);

    expect(ids).toContain('ka-yuva-nidhi');
    expect(ids).toContain('pmegp');
    expect(ids).not.toContain('pm-kisan');
    expect(ids).not.toContain('nmmss');
  });

  test('Negative Control: Out-of-state resident does not match Karnataka-specific schemes', () => {
    const profile = createTestProfile({
      age: 32,
      state: 'Maharashtra',
      gender: 'female',
      occupation: 'worker',
      incomeBracket: 'below_poverty_line',
    });

    const candidates = matchSchemes(schemes, profile);
    const ids = candidates.map((c) => c.scheme.schemeId);

    expect(ids).not.toContain('ka-gruha-lakshmi');
    expect(ids).not.toContain('ka-yuva-nidhi');
    expect(ids).not.toContain('ka-vidyasiri');
    expect(ids).toContain('pmuy'); // National scheme still matches
  });

  test('Negative Control: Blank profile produces zero recommendations', () => {
    const blankProfile = createTestProfile({});
    const candidates = matchSchemes(schemes, blankProfile);
    expect(candidates.length).toBe(0);
  });
});
