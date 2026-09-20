export type SupportedLanguage = 'en' | 'hi' | 'kn';

export interface ApiEnvelope<T> {
  requestId: string;
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export type AttributeStatus = 'provided' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low' | null;
export type AttributeValue = string | number | boolean | string[] | null;

export interface Attribute {
  status: AttributeStatus;
  value?: AttributeValue;
  confidence: Confidence;
  sensitive: boolean;
}

export type AttributeName =
  | 'age'
  | 'state'
  | 'occupation'
  | 'incomeBracket'
  | 'gender'
  | 'educationLevel'
  | 'category'
  | 'disability';

export type Attributes = Record<AttributeName, Attribute>;

export interface Profile {
  language: SupportedLanguage;
  rawText: string;
  attributes: Attributes;
}

export interface ProfileInput {
  language: SupportedLanguage;
  text: string;
}

export interface MatchedAttribute {
  attribute: AttributeName;
  userValue: AttributeValue;
  schemeCondition: string;
}

export interface UnknownCondition {
  attribute: string;
  label: string;
}

export interface Candidate {
  schemeId: string;
  name: string;
  localizedName: string;
  state: string | string[];
  category: string[];
  benefits: Array<Record<string, string>>;
  matchedAttributes: MatchedAttribute[];
  unknownConditions: UnknownCondition[];
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

export interface EligibilityCondition {
  attribute: string;
  operator: 'eq' | 'between' | 'in' | 'gte' | 'lte';
  value: string | number | boolean | string[] | number[];
  required: boolean;
}

export interface Scheme {
  schemeId: string;
  name: string;
  localizedName: Record<string, string>;
  description: Record<string, string>;
  benefits: Array<Record<string, string>>;
  eligibility: EligibilityCondition[];
  documents: Array<Record<string, string>>;
  state: string | string[];
  category: string[];
  applicationUrl: string;
  officialSource: string;
  sourceName: string;
  lastVerified: string;
  active: boolean;
  unknownConditions: string[];
  helpline?: string;
  department?: string;
  verificationStatus: string;
}

export interface RecognitionStartResult {
  jobId: string;
}

export type RecognitionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface RecognitionResult {
  status: RecognitionStatus;
  text?: string;
  languageCode?: string;
}

export interface SynthesisResult {
  audioBase64: string;
  contentType: string;
}
