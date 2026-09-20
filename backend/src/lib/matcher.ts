import type { AttributeName, Attributes, Profile } from '../models/profile.js';
import type { EligibilityCondition, MatchResult, Scheme, Candidate, ConditionResult } from '../models/scheme.js';
import { getLocalized } from '../models/scheme.js';

const ATTRIBUTE_LABELS: Record<AttributeName, string> = {
  age: 'age',
  state: 'state',
  occupation: 'occupation',
  incomeBracket: 'household income',
  gender: 'gender',
  educationLevel: 'education level',
  category: 'caste/category',
  disability: 'disability status',
};

function formatCondition(condition: EligibilityCondition): string {
  if (condition.operator === 'between' && Array.isArray(condition.value)) {
    return `${condition.attribute} between ${condition.value[0]} and ${condition.value[1]}`;
  }
  return `${condition.attribute} ${condition.operator} ${condition.value}`;
}

function compareCondition(condition: EligibilityCondition, userValue: unknown): ConditionResult {
  if (userValue === null || userValue === undefined) {
    return 'UNKNOWN';
  }

  const { operator, value } = condition;

  switch (operator) {
    case 'eq':
      return userValue === value ? 'MATCHED' : 'NOT_MET';

    case 'in':
      if (Array.isArray(value)) {
        return (value as Array<string | number>).includes(userValue as string | number) ? 'MATCHED' : 'NOT_MET';
      }
      return 'NOT_MET';

    case 'between':
      if (typeof userValue !== 'number' || !Array.isArray(value) || value.length !== 2) {
        return 'NOT_MET';
      }
      return userValue >= (value[0] as number) && userValue <= (value[1] as number) ? 'MATCHED' : 'NOT_MET';

    case 'gte':
      if (typeof userValue !== 'number' || typeof value !== 'number') {
        return 'NOT_MET';
      }
      return userValue >= value ? 'MATCHED' : 'NOT_MET';

    case 'lte':
      if (typeof userValue !== 'number' || typeof value !== 'number') {
        return 'NOT_MET';
      }
      return userValue <= value ? 'MATCHED' : 'NOT_MET';

    default:
      return 'UNKNOWN';
  }
}

function evaluateCondition(condition: EligibilityCondition, attributes: Attributes): ConditionResult {
  const attr = attributes[condition.attribute as AttributeName];
  if (!attr || attr.status !== 'provided' || attr.value === null || attr.value === undefined) {
    return 'UNKNOWN';
  }
  return compareCondition(condition, attr.value);
}

export function matchScheme(scheme: Scheme, attributes: Attributes): MatchResult {
  const conditionResults: Record<string, ConditionResult> = {};
  const matchedConditions: EligibilityCondition[] = [];
  const unmetConditions: EligibilityCondition[] = [];
  const unknownConditions: EligibilityCondition[] = [];
  let matchedRequiredCount = 0;
  let matchedOptionalCount = 0;
  let unknownRequiredCount = 0;

  for (const condition of scheme.eligibility) {
    const result = evaluateCondition(condition, attributes);
    conditionResults[condition.attribute] = result;

    if (result === 'MATCHED') {
      matchedConditions.push(condition);
      if (condition.required) {
        matchedRequiredCount++;
      } else {
        matchedOptionalCount++;
      }
    } else if (result === 'NOT_MET') {
      unmetConditions.push(condition);
    } else {
      unknownConditions.push(condition);
      if (condition.required) {
        unknownRequiredCount++;
      }
    }
  }

  return {
    scheme,
    conditionResults,
    matchedConditions,
    unmetConditions,
    unknownConditions,
    matchedRequiredCount,
    matchedOptionalCount,
    unknownRequiredCount,
  };
}

export function isCandidate(result: MatchResult): boolean {
  // A scheme is a candidate only if:
  // 1. No required condition is NOT_MET.
  // 2. At least one condition (required or optional) is MATCHED.
  const anyUnmetRequired = result.unmetConditions.some((c) => c.required);
  const anyMatched = result.matchedConditions.length > 0;
  return !anyUnmetRequired && anyMatched;
}

export function matchSchemes(schemes: Scheme[], profile: Profile): MatchResult[] {
  const results = schemes.map((scheme) => matchScheme(scheme, profile.attributes));
  const candidates = results.filter(isCandidate);

  // Deterministic sorting:
  // 1. More matched required conditions first.
  // 2. More matched optional conditions second.
  // 3. Fewer unknown required conditions third (more certainty).
  // 4. Stable alphabetical tie-breaker by schemeId.
  candidates.sort((a, b) => {
    if (b.matchedRequiredCount !== a.matchedRequiredCount) {
      return b.matchedRequiredCount - a.matchedRequiredCount;
    }
    if (b.matchedOptionalCount !== a.matchedOptionalCount) {
      return b.matchedOptionalCount - a.matchedOptionalCount;
    }
    if (a.unknownRequiredCount !== b.unknownRequiredCount) {
      return a.unknownRequiredCount - b.unknownRequiredCount;
    }
    return a.scheme.schemeId.localeCompare(b.scheme.schemeId);
  });

  return candidates;
}

function buildExplanation(result: MatchResult, language: string): Candidate['explanation'] {
  const matched: string[] = result.matchedConditions.map((condition) => {
    const label = ATTRIBUTE_LABELS[condition.attribute as AttributeName] ?? condition.attribute;
    return `Your ${label} matches ${formatCondition(condition)}`;
  });

  const verify: string[] = result.unknownConditions
    .filter((condition) => condition.required)
    .map((condition) => {
      const label = ATTRIBUTE_LABELS[condition.attribute as AttributeName] ?? condition.attribute;
      return `Your ${label}`;
    });

  const textParts: string[] = [
    'This scheme may be relevant based on the information you provided.',
    ...(matched.length > 0 ? ['Matched: ' + matched.join('; ') + '.'] : []),
    ...(verify.length > 0 ? ['Still verify: ' + verify.join('; ') + '.'] : []),
  ];

  return {
    language,
    matched,
    verify,
    text: textParts.join(' '),
  };
}

export function toCandidate(result: MatchResult, attributes: Attributes, language: string): Candidate {
  const scheme = result.scheme;
  const matchedAttributes = result.matchedConditions.map((condition) => {
    const attr = attributes[condition.attribute as AttributeName];
    return {
      attribute: condition.attribute as AttributeName,
      userValue: attr?.value ?? null,
      schemeCondition: formatCondition(condition),
    };
  });

  const unknownConditions = result.unknownConditions.map((condition) => ({
    attribute: condition.attribute,
    label: ATTRIBUTE_LABELS[condition.attribute as AttributeName] ?? condition.attribute,
  }));

  return {
    schemeId: scheme.schemeId,
    name: scheme.name,
    localizedName: getLocalized(scheme, language, 'localizedName'),
    state: scheme.state,
    category: scheme.category,
    benefits: scheme.benefits,
    matchedAttributes,
    unknownConditions,
    documents: scheme.documents,
    applicationUrl: scheme.applicationUrl,
    officialSource: scheme.officialSource,
    sourceName: scheme.sourceName,
    lastVerified: scheme.lastVerified,
    verificationStatus: scheme.verificationStatus,
    explanation: buildExplanation(result, language),
  };
}
