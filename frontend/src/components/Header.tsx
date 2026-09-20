import type { Step } from '../App';
import type { SupportedLanguage } from '../lib/types';
import { translate } from '../lib/i18n';
import { LANGUAGES } from '../lib/languages';
import { CaretLeft } from '@phosphor-icons/react';

interface HeaderProps {
  lang: SupportedLanguage;
  onLanguageChange: (l: SupportedLanguage) => void;
  step: Step;
  onHome: () => void;
  onBack: (() => void) | undefined;
}

function showBack(step: Step): boolean {
  return (
    step.name === 'input' ||
    step.name === 'profile' ||
    step.name === 'results' ||
    step.name === 'detail' ||
    (step.name === 'error' && !!step.recover)
  );
}

export function Header({ lang, onLanguageChange, step, onHome, onBack }: HeaderProps) {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);

  return (
    <header className={`g-head ${step.name === 'welcome' ? 'g-head--landing' : ''}`}>
      <nav className="g-head__inner" aria-label={t('app.name')}>
        {showBack(step) ? (
          <button className="g-icon-btn" onClick={onBack} aria-label={t('header.back')}>
            <CaretLeft weight="bold" />
          </button>
        ) : null}

        <a className="g-head__brand" href="#" onClick={(e) => { e.preventDefault(); onHome(); }} aria-label={t('app.name')}>
          <img
            className="g-brand-logo"
            src="/primary-logo-dark.png"
            alt=""
            aria-hidden="true"
          />
          <span>{t('app.name')}</span>
        </a>

        <span className="g-head__spacer" />

        {step.name !== 'welcome' ? (
          <div className="g-langseg" role="group" aria-label={t('header.language')}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className="g-langseg__btn"
                aria-pressed={l.code === lang}
                onClick={() => onLanguageChange(l.code)}
                title={l.english}
              >
                <span className="g-langseg__full" aria-hidden="true">{l.native}</span>
                <span className="g-langseg__short" aria-hidden="true">{l.short}</span>
                <span className="sr-only">{l.english}</span>
              </button>
            ))}
          </div>
        ) : null}
      </nav>
    </header>
  );
}
