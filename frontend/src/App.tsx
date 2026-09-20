import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { Candidate, Profile, Scheme, SupportedLanguage } from './lib/types';
import { translate, type TranslateFn } from './lib/i18n';
import { detectLanguage } from './lib/languages';
import { Header } from './components/Header';
import { LandingScreen } from './screens/LandingScreen';
import { InputScreen } from './screens/InputScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { RecommendationsScreen } from './screens/RecommendationsScreen';
import { SchemeDetailScreen } from './screens/SchemeDetailScreen';
import { ErrorScreen } from './screens/ErrorScreen';

export type Step =
  | { name: 'welcome' }
  | { name: 'input'; mode: 'voice' | 'type' }
  | { name: 'profile'; profile: Profile }
  | { name: 'results'; profile: Profile; candidates: Candidate[] }
  | { name: 'detail'; profile: Profile; candidates: Candidate[]; candidate: Candidate; scheme: Scheme | null }
  | { name: 'error'; message: string; recover?: () => void };

export type Mood = 'calm' | 'input' | 'listening' | 'understanding';

const MOOD_BY_STEP: Record<Step['name'], Mood> = {
  welcome: 'calm',
  input: 'input',
  profile: 'understanding',
  results: 'understanding',
  detail: 'calm',
  error: 'calm',
};

export function App() {
  const [lang, setLang] = useState<SupportedLanguage>(() => detectLanguage());
  const [step, setStep] = useState<Step>({ name: 'welcome' });
  const [mood, setMood] = useState<Mood>('calm');

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Dark-only. The dark token set is applied unconditionally.
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step.name]);

  const t = useMemo<TranslateFn>(
    () => (key, vars) => translate(lang, key, vars),
    [lang]
  );

  const reset = () => {
    setStep({ name: 'welcome' });
    setMood('calm');
  };

  const resetMood = () => {
    if (step.name !== 'input') setMood(MOOD_BY_STEP[step.name]);
  };

  return (
    <div className="g-app">
      <div className="g-ambient" data-mood={mood} aria-hidden="true" />
      <Header
        lang={lang}
        onLanguageChange={setLang}
        step={step}
        onHome={reset}
        onBack={() => {
          if (step.name === 'input') setStep({ name: 'welcome' });
          else if (step.name === 'profile') setStep({ name: 'input', mode: 'voice' });
          else if (step.name === 'results') setStep({ name: 'profile', profile: step.profile });
          else if (step.name === 'detail')
            setStep({ name: 'results', profile: step.profile, candidates: step.candidates });
          else if (step.name === 'error' && step.recover) step.recover();
          resetMood();
        }}
      />
      <main className={step.name === 'welcome' ? 'g-main g-main--landing' : step.name === 'detail' ? 'g-shell g-shell--reading' : 'g-shell'}>
        <Route
          t={t}
          lang={lang}
          step={step}
          setStep={setStep}
          setLang={setLang}
          reset={reset}
          setMood={setMood}
        />
      </main>
    </div>
  );
}

function Route(props: {
  t: TranslateFn;
  lang: SupportedLanguage;
  step: Step;
  setStep: Dispatch<SetStateAction<Step>>;
  setLang: (l: SupportedLanguage) => void;
  reset: () => void;
  setMood: (m: Mood) => void;
}) {
  const { t, lang, step, setStep, setLang, reset, setMood } = props;

  const go = (next: Step) => {
    setStep(next);
    setMood(MOOD_BY_STEP[next.name]);
  };

  const screen = (child: ReactNode) => (
    <div className="g-screen-wrap" key={step.name}>
      {child}
    </div>
  );

  switch (step.name) {
    case 'welcome':
      return screen(
        <LandingScreen
          t={t}
          lang={lang}
          onSelectLanguage={(selected) => setLang(selected)}
          onStart={(mode) => go({ name: 'input', mode })}
        />
      );

    case 'input':
      return screen(
        <InputScreen
          t={t}
          lang={lang}
          initialMode={step.mode}
          onMood={setMood}
          onExtracted={(profile) => go({ name: 'profile', profile })}
          onError={(message) => go({ name: 'error', message, recover: () => go({ name: 'input', mode: 'voice' }) })}
        />
      );

    case 'profile':
      return screen(
        <ProfileScreen
          t={t}
          lang={lang}
          profile={step.profile}
          onConfirm={(updated, candidates) => go({ name: 'results', profile: updated, candidates })}
        />
      );

    case 'results':
      return screen(
        <RecommendationsScreen
          t={t}
          lang={lang}
          profile={step.profile}
          candidates={step.candidates}
          onOpen={(candidate) =>
            go({ name: 'detail', profile: step.profile, candidates: step.candidates, candidate, scheme: null })
          }
          onEditProfile={() => go({ name: 'profile', profile: step.profile })}
          onStartOver={reset}
        />
      );

    case 'detail':
      return screen(
        <SchemeDetailScreen
          t={t}
          lang={lang}
          profile={step.profile}
          candidate={step.candidate}
          scheme={step.scheme}
          onSchemeLoaded={(scheme) => setStep((prev) => (prev.name === 'detail' ? { ...prev, scheme } : prev))}
          onLoadError={(message) =>
            setStep((prev) =>
              prev.name === 'detail'
                ? { name: 'error', message, recover: () => setStep({ name: 'detail', profile: prev.profile, candidates: prev.candidates, candidate: prev.candidate, scheme: prev.scheme }) }
                : prev
            )
          }
          onBack={() => setStep({ name: 'results', profile: step.profile, candidates: step.candidates })}
        />
      );

    case 'error':
      return screen(<ErrorScreen t={t} message={step.message} onRetry={step.recover} onHome={reset} />);
  }
}
