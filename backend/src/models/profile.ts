import { z } from 'zod';

export const SUPPORTED_LANGUAGES = ['hi', 'kn', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const ATTRIBUTE_NAMES = [
  'age',
  'state',
  'occupation',
  'incomeBracket',
  'gender',
  'educationLevel',
  'category',
  'disability',
] as const;

export type AttributeName = (typeof ATTRIBUTE_NAMES)[number];

export const SENSITIVE_ATTRIBUTES: Set<AttributeName> = new Set([
  'category',
  'disability',
  'incomeBracket',
  'gender',
]);

export const INCOME_BRACKETS = [
  'below_poverty_line',
  'low',
  'lower_middle',
  'middle',
  'high',
  'unknown',
] as const;

export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;

export const EDUCATION_LEVELS = [
  'none',
  'primary',
  'secondary',
  'higher_secondary',
  'undergraduate',
  'postgraduate',
  'doctorate',
  'unknown',
] as const;

export const CATEGORIES = ['SC', 'ST', 'OBC', 'general', 'other', 'unknown'] as const;

export const DISABILITIES = ['yes', 'no', 'prefer_not_to_say'] as const;

const ConfidenceSchema = z.enum(['high', 'medium', 'low']).nullable();

export type AttributeValue = string | number | boolean | string[] | null;

export interface Attribute {
  status: 'provided' | 'unknown';
  value?: AttributeValue;
  confidence: 'high' | 'medium' | 'low' | null;
  sensitive: boolean;
}

export const AttributeSchema = z.object({
  status: z.enum(['provided', 'unknown']),
  value: z.any().optional(),
  confidence: ConfidenceSchema.default(null),
  sensitive: z.boolean(),
});

export interface Attributes {
  age: Attribute;
  state: Attribute;
  occupation: Attribute;
  incomeBracket: Attribute;
  gender: Attribute;
  educationLevel: Attribute;
  category: Attribute;
  disability: Attribute;
}

export const AttributesSchema = z.object({
  age: AttributeSchema,
  state: AttributeSchema,
  occupation: AttributeSchema,
  incomeBracket: AttributeSchema,
  gender: AttributeSchema,
  educationLevel: AttributeSchema,
  category: AttributeSchema,
  disability: AttributeSchema,
});

export interface Profile {
  language: SupportedLanguage;
  rawText: string;
  attributes: Attributes;
}

export const ProfileSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  rawText: z.string().min(1).max(2000),
  attributes: AttributesSchema,
});

export interface ProfileInput {
  language: SupportedLanguage;
  text: string;
}

export const ProfileInputSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  text: z.string().min(1).max(2000),
});

const CANONICAL_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

function normalizeState(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase();
  const match = CANONICAL_STATES.find((s) => s.toLowerCase() === clean);
  return match ?? null;
}

function normalizeIncome(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    bpl: 'below_poverty_line',
    below_poverty_line: 'below_poverty_line',
    poor: 'below_poverty_line',
    low: 'low',
    low_income: 'low',
    lower_middle: 'lower_middle',
    middle: 'middle',
    mid: 'middle',
    high: 'high',
    rich: 'high',
  };
  return map[clean] ?? null;
}

function normalizeGender(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase();
  const map: Record<string, string> = {
    male: 'male',
    man: 'male',
    boy: 'male',
    female: 'female',
    woman: 'female',
    girl: 'female',
    other: 'other',
    'prefer not to say': 'prefer_not_to_say',
    prefer_not_to_say: 'prefer_not_to_say',
  };
  return map[clean] ?? null;
}

function normalizeEducation(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    none: 'none',
    primary: 'primary',
    secondary: 'secondary',
    higher_secondary: 'higher_secondary',
    '10th': 'secondary',
    '12th': 'higher_secondary',
    undergraduate: 'undergraduate',
    graduate: 'undergraduate',
    bachelors: 'undergraduate',
    postgraduate: 'postgraduate',
    masters: 'postgraduate',
    doctorate: 'doctorate',
    phd: 'doctorate',
  };
  return map[clean] ?? null;
}

function normalizeCategory(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toUpperCase();
  const map: Record<string, string> = {
    SC: 'SC',
    ST: 'ST',
    OBC: 'OBC',
    GENERAL: 'general',
    GEN: 'general',
    OTHER: 'other',
  };
  return map[clean] ?? null;
}

function normalizeDisability(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase();
  const map: Record<string, string> = {
    yes: 'yes',
    no: 'no',
    'prefer not to say': 'prefer_not_to_say',
    prefer_not_to_say: 'prefer_not_to_say',
  };
  return map[clean] ?? null;
}

function normalizeAge(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 && value <= 120 ? value : null;
  if (typeof value === 'string') {
    const n = Number.parseInt(value.trim(), 10);
    if (Number.isNaN(n)) return null;
    return n >= 0 && n <= 120 ? n : null;
  }
  return null;
}

function normalizeOccupation(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().toLowerCase() : null;
}

function normalizeAttribute(
  name: AttributeName,
  attr: Partial<Attribute>
): Attribute {
  const sensitive = SENSITIVE_ATTRIBUTES.has(name);
  let status = attr.status ?? 'unknown';
  let value = attr.value ?? null;
  let confidence: 'high' | 'medium' | 'low' | null = attr.confidence ?? null;

  // Normalize values based on attribute type.
  const normalizers: Record<AttributeName, (v: unknown) => unknown> = {
    age: normalizeAge,
    state: normalizeState,
    occupation: normalizeOccupation,
    incomeBracket: normalizeIncome,
    gender: normalizeGender,
    educationLevel: normalizeEducation,
    category: normalizeCategory,
    disability: normalizeDisability,
  };

  if (status === 'provided') {
    const normalized = normalizers[name](value);
    if (normalized === null) {
      // The model claimed this fact but it could not be normalized into a
      // valid value. Treat the extraction as malformed rather than silently
      // converting a provided-but-invalid value into "unknown".
      throw new Error(`Provided attribute ${name} could not be normalized`);
    }
    value = normalized as AttributeValue;
  }

  // Safety rule: sensitive attributes must be explicitly stated with high
  // confidence. Anything else becomes unknown.
  if (sensitive && (status !== 'provided' || confidence !== 'high')) {
    status = 'unknown';
    value = null;
    confidence = null;
  }

  return {
    status,
    value,
    confidence,
    sensitive,
  };
}

export function unknownProfile(): Attributes {
  return Object.fromEntries(
    ATTRIBUTE_NAMES.map((name) => [
      name,
      {
        status: 'unknown',
        value: null,
        confidence: null,
        sensitive: SENSITIVE_ATTRIBUTES.has(name),
      },
    ])
  ) as unknown as Attributes;
}

export function normalizeProfile(input: {
  language: SupportedLanguage;
  rawText: string;
  attributes?: Partial<
    Record<AttributeName, Partial<{ status: string; value?: unknown; confidence?: string | null }>>
  >;
}): Profile {
  const base = unknownProfile();
  const provided = input.attributes ?? {};
  for (const name of ATTRIBUTE_NAMES) {
    base[name] = normalizeAttribute(
      name,
      (provided[name] ?? {}) as Partial<Attribute>
    );
  }
  return {
    language: input.language,
    rawText: input.rawText,
    attributes: base,
  };
}

export function validateProfile(profile: unknown): Profile | null {
  const parsed = ProfileSchema.safeParse(profile);
  return parsed.success ? parsed.data : null;
}
