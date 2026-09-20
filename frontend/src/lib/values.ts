import type { SupportedLanguage } from './types';

type ValueLabel = Record<SupportedLanguage, string>;
type ChoiceMap = Record<string, ValueLabel>;

const INCOME_LABELS: ChoiceMap = {
  below_poverty_line: { en: 'Below poverty line', hi: 'गरीबी रेखा से नीचे', kn: 'ಬಡತನ ರೇಖೆಗಿಂತ ಕೆಳಗೆ' },
  low: { en: 'Low income', hi: 'कम आय', kn: 'ಕಡಿಮೆ ಆದಾಯ' },
  lower_middle: { en: 'Lower-middle income', hi: 'निम्न-मध्यम आय', kn: 'ಕೆಳ-ಮಧ್ಯಮ ಆದಾಯ' },
  middle: { en: 'Middle income', hi: 'मध्यम आय', kn: 'ಮಧ್ಯಮ ಆದಾಯ' },
  high: { en: 'High income', hi: 'उच्च आय', kn: 'ಹೆಚ್ಚಿನ ಆದಾಯ' },
};

const GENDER_LABELS: ChoiceMap = {
  male: { en: 'Male', hi: 'पुरुष', kn: 'ಪುರುಷ' },
  female: { en: 'Female', hi: 'महिला', kn: 'ಮಹಿಳೆ' },
  other: { en: 'Other', hi: 'अन्य', kn: 'ಇತರೆ' },
  prefer_not_to_say: { en: 'Prefer not to say', hi: 'नहीं बताना चाहेंगे', kn: 'ಹೇಳಲು ಬಯಸುವುದಿಲ್ಲ' },
};

const EDUCATION_LABELS: ChoiceMap = {
  none: { en: 'No formal education', hi: 'कोई औपचारिक शिक्षा नहीं', kn: 'ಔಪಚಾರಿಕ ಶಿಕ್ಷಣವಿಲ್ಲ' },
  primary: { en: 'Primary school', hi: 'प्राथमिक विद्यालय', kn: 'ಪ್ರಾಥಮಿಕ ಶಾಲೆ' },
  secondary: { en: 'Secondary school', hi: 'माध्यमिक विद्यालय', kn: 'ಮಾಧ್ಯಮಿಕ ಶಾಲೆ' },
  higher_secondary: { en: 'Higher secondary', hi: 'उच्च माध्यमिक', kn: 'ಪದವಿ ಪೂರ್ವ' },
  undergraduate: { en: 'Undergraduate', hi: 'स्नातक', kn: 'ಪದವಿ' },
  postgraduate: { en: 'Postgraduate', hi: 'स्नातकोत्तर', kn: 'ಸ್ನಾತಕೋತ್ತರ' },
  doctorate: { en: 'Doctorate', hi: 'डॉक्टरेट', kn: 'ಡಾಕ್ಟರೇಟ್' },
};

const CATEGORY_LABELS: ChoiceMap = {
  SC: { en: 'SC', hi: 'अनुसूचित जाति', kn: 'ಪರಿಶಿಷ್ಟ ಜಾತಿ' },
  ST: { en: 'ST', hi: 'अनुसूचित जनजाति', kn: 'ಪರಿಶಿಷ್ಟ ಪಂಗಡ' },
  OBC: { en: 'OBC', hi: 'अन्य पिछड़ा वर्ग', kn: 'ಇತರೆ ಹಿಂದುಳಿದ ವರ್ಗ' },
  general: { en: 'General', hi: 'सामान्य', kn: 'ಸಾಮಾನ್ಯ' },
  other: { en: 'Other', hi: 'अन्य', kn: 'ಇತರೆ' },
};

const DISABILITY_LABELS: ChoiceMap = {
  yes: { en: 'Yes', hi: 'हाँ', kn: 'ಹೌದು' },
  no: { en: 'No', hi: 'नहीं', kn: 'ಇಲ್ಲ' },
  prefer_not_to_say: { en: 'Prefer not to say', hi: 'नहीं बताना चाहेंगे', kn: 'ಹೇಳಲು ಬಯಸುವುದಿಲ್ಲ' },
};

const OCCUPATION_LABELS: ChoiceMap = {
  farmer: { en: 'Farmer', hi: 'किसान', kn: 'ರೈತ' },
  student: { en: 'Student', hi: 'छात्र', kn: 'ವಿದ್ಯಾರ್ಥಿ' },
  entrepreneur: { en: 'Entrepreneur', hi: 'उद्यमी', kn: 'ಉದ್ಯಮಿ' },
  'daily wage worker': { en: 'Daily wage worker', hi: 'दिहाड़ी मज़दूर', kn: 'ದಿನಗೂಲಿ ಕಾರ್ಮಿಕ' },
  laborer: { en: 'Labourer', hi: 'मज़दूर', kn: 'ಕೂಲಿ ಕಾರ್ಮಿಕ' },
  'government employee': { en: 'Government employee', hi: 'सरकारी कर्मचारी', kn: 'ಸರ್ಕಾರಿ ನೌಕರ' },
  'self-employed': { en: 'Self-employed', hi: 'स्व-रोज़गार', kn: 'ಸ್ವಯಂ ಉದ್ಯೋಗಿ' },
  homemaker: { en: 'Homemaker', hi: 'गृहिणी', kn: 'ಗೃಹಿಣಿ' },
  unemployed: { en: 'Unemployed', hi: 'बेरोज़गार', kn: 'ನಿರುದ್ಯೋಗಿ' },
  retired: { en: 'Retired', hi: 'सेवानिवृत्त', kn: 'ನಿವೃತ್ತ' },
};

const STATE_LABELS: ChoiceMap = {
  'Andhra Pradesh': { en: 'Andhra Pradesh', hi: 'आंध्र प्रदेश', kn: 'ಆಂಧ್ರ ಪ್ರದೇಶ' },
  'Arunachal Pradesh': { en: 'Arunachal Pradesh', hi: 'अरुणाचल प्रदेश', kn: 'ಅರುಣಾಚಲ ಪ್ರದೇಶ' },
  Assam: { en: 'Assam', hi: 'असम', kn: 'ಅಸ್ಸಾಂ' },
  Bihar: { en: 'Bihar', hi: 'बिहार', kn: 'ಬಿಹಾರ' },
  Chhattisgarh: { en: 'Chhattisgarh', hi: 'छत्तीसगढ़', kn: 'ಛತ್ತೀಸ್‌ಗಢ' },
  Goa: { en: 'Goa', hi: 'गोवा', kn: 'ಗೋವಾ' },
  Gujarat: { en: 'Gujarat', hi: 'गुजरात', kn: 'ಗುಜರಾತ್' },
  Haryana: { en: 'Haryana', hi: 'हरियाणा', kn: 'ಹರಿಯಾಣ' },
  'Himachal Pradesh': { en: 'Himachal Pradesh', hi: 'हिमाचल प्रदेश', kn: 'ಹಿಮಾಚಲ ಪ್ರದೇಶ' },
  Jharkhand: { en: 'Jharkhand', hi: 'झारखंड', kn: 'ಝಾರ್ಖಂಡ್' },
  Karnataka: { en: 'Karnataka', hi: 'कर्नाटक', kn: 'ಕರ್ನಾಟಕ' },
  Kerala: { en: 'Kerala', hi: 'केरल', kn: 'ಕೇರಳ' },
  'Madhya Pradesh': { en: 'Madhya Pradesh', hi: 'मध्य प्रदेश', kn: 'ಮಧ್ಯ ಪ್ರದೇಶ' },
  Maharashtra: { en: 'Maharashtra', hi: 'महाराष्ट्र', kn: 'ಮಹಾರಾಷ್ಟ್ರ' },
  Manipur: { en: 'Manipur', hi: 'मणिपुर', kn: 'ಮಣಿಪುರ' },
  Meghalaya: { en: 'Meghalaya', hi: 'मेघालय', kn: 'ಮೇಘಾಲಯ' },
  Mizoram: { en: 'Mizoram', hi: 'मिज़ोरम', kn: 'ಮಿಝೋರಾಂ' },
  Nagaland: { en: 'Nagaland', hi: 'नागालैंड', kn: 'ನಾಗಾಲ್ಯಾಂಡ್' },
  Odisha: { en: 'Odisha', hi: 'ओडिशा', kn: 'ಒಡಿಶಾ' },
  Punjab: { en: 'Punjab', hi: 'पंजाब', kn: 'ಪಂಜಾಬ್' },
  Rajasthan: { en: 'Rajasthan', hi: 'राजस्थान', kn: 'ರಾಜಸ್ಥಾನ' },
  Sikkim: { en: 'Sikkim', hi: 'सिक्किम', kn: 'ಸಿಕ್ಕಿಂ' },
  'Tamil Nadu': { en: 'Tamil Nadu', hi: 'तमिल नाडु', kn: 'ತಮಿಳುನಾಡು' },
  Telangana: { en: 'Telangana', hi: 'तेलंगाना', kn: 'ತೆಲಂಗಾಣ' },
  Tripura: { en: 'Tripura', hi: 'त्रिपुरा', kn: 'ತ್ರಿಪುರ' },
  'Uttar Pradesh': { en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश', kn: 'ಉತ್ತರ ಪ್ರದೇಶ' },
  Uttarakhand: { en: 'Uttarakhand', hi: 'उत्तराखंड', kn: 'ಉತ್ತರಾಖಂಡ' },
  'West Bengal': { en: 'West Bengal', hi: 'पश्चिम बंगाल', kn: 'ಪಶ್ಚಿಮ ಬಂಗಾಳ' },
};

const ALL: ChoiceMap = {
  ...INCOME_LABELS,
  ...GENDER_LABELS,
  ...EDUCATION_LABELS,
  ...CATEGORY_LABELS,
  ...DISABILITY_LABELS,
  ...OCCUPATION_LABELS,
  ...STATE_LABELS,
};

export function localizeValue(
  lang: SupportedLanguage,
  raw: string | number | boolean | null | undefined
): string {
  if (raw === null || raw === undefined) return '';
  const key = String(raw);
  const entry = ALL[key];
  if (entry) return entry[lang];
  // Fallback: capitalize a free-text value (e.g. occupation) for Latin; leave scripts as-is.
  if (lang === 'en') {
    return key.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return key;
}
