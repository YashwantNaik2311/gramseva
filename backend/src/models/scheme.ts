import { z } from 'zod';
import type { AttributeName, AttributeValue } from './profile.js';

export const SUPPORTED_OPERATORS = ['eq', 'between', 'in', 'gte', 'lte'] as const;
export type Operator = (typeof SUPPORTED_OPERATORS)[number];

export const EligibilityConditionSchema = z.object({
  attribute: z.string(),
  operator: z.enum(SUPPORTED_OPERATORS),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.array(z.number())]),
  required: z.boolean().default(true),
});

export type EligibilityCondition = z.infer<typeof EligibilityConditionSchema>;

export const SchemeSchema = z.object({
  schemeId: z.string(),
  name: z.string(),
  localizedName: z.record(z.string(), z.string()).default({}),
  description: z.record(z.string(), z.string()).default({}),
  benefits: z.array(z.record(z.string(), z.string())).default([]),
  eligibility: z.array(EligibilityConditionSchema).default([]),
  documents: z.array(z.record(z.string(), z.string())).default([]),
  state: z.union([z.string(), z.array(z.string())]).default([]),
  category: z.array(z.string()).default([]),
  applicationUrl: z.string().default(''),
  officialSource: z.string().default(''),
  sourceName: z.string().default(''),
  lastVerified: z.string().default(''),
  active: z.boolean().default(false),
  unknownConditions: z.array(z.string()).default([]),
  helpline: z.string().optional(),
  department: z.string().optional(),
  verificationStatus: z.string().default('unverified'),
});

export type Scheme = z.infer<typeof SchemeSchema>;

export type ConditionResult = 'MATCHED' | 'NOT_MET' | 'UNKNOWN';

export interface MatchResult {
  scheme: Scheme;
  conditionResults: Record<string, ConditionResult>;
  matchedConditions: EligibilityCondition[];
  unmetConditions: EligibilityCondition[];
  unknownConditions: EligibilityCondition[];
  matchedRequiredCount: number;
  matchedOptionalCount: number;
  unknownRequiredCount: number;
}

export interface Candidate {
  schemeId: string;
  name: string;
  localizedName: string;
  state: string | string[];
  category: string[];
  benefits: Array<Record<string, string>>;
  matchedAttributes: Array<{ attribute: AttributeName; userValue: AttributeValue; schemeCondition: string }>;
  unknownConditions: Array<{ attribute: string; label: string }>;
  documents: Array<Record<string, string>>;
  applicationUrl: string;
  officialSource: string;
  sourceName: string;
  lastVerified: string;
  verificationStatus: string;
  explanation: {
    language: string;
    matched: string[];
    verify: string[];
    text: string;
  };
}

export function validateScheme(record: unknown): Scheme | null {
  const parsed = SchemeSchema.safeParse(record);
  return parsed.success ? parsed.data : null;
}

export function getLocalized(scheme: Scheme, language: string, field: 'localizedName' | 'description'): string {
  const map = scheme[field];
  if (typeof map === 'object' && map !== null) {
    return map[language] ?? map['en'] ?? scheme.name ?? '';
  }
  return scheme.name ?? '';
}
