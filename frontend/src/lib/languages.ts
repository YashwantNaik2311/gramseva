import type { SupportedLanguage } from './types';

export const LANGUAGES: Array<{ code: SupportedLanguage; native: string; short: string; english: string }> = [
  { code: 'en', native: 'English', short: 'EN', english: 'English' },
  { code: 'hi', native: 'हिन्दी', short: 'हि', english: 'Hindi' },
  { code: 'kn', native: 'ಕನ್ನಡ', short: 'ಕ', english: 'Kannada' },
];

export function detectLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return 'en';
  const nav = navigator.language?.toLowerCase() ?? '';
  if (nav.startsWith('hi')) return 'hi';
  if (nav.startsWith('kn')) return 'kn';
  return 'en';
}
