import { useEffect, useRef, useState } from 'react';
import type { SupportedLanguage } from '../lib/types';
import type { TranslateFn } from '../lib/i18n';
import { LANGUAGES } from '../lib/languages';
import { Check, Microphone, Keyboard, ArrowDown, ArrowRight } from '@phosphor-icons/react';

interface LandingProps {
  t: TranslateFn;
  lang: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  onStart: (mode: 'voice' | 'type') => void;
}

export function LandingScreen({ t, lang, onSelectLanguage, onStart }: LandingProps) {
  const [scrollY, setScrollY] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const revealRef = useRef<HTMLDivElement>(null);
  const ticking = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        if (!reduce) setScrollY(window.scrollY);
        ticking.current = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = revealRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setRevealed(true);
      },
      { rootMargin: '-12% 0px -12% 0px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const parallax = (factor: number) => ({ transform: `translate3d(0, ${scrollY * factor}px, 0)` });

  return (
    <div className="g-landing" aria-label={t('app.name')}>
      <section className="g-hero">
        <div className="g-landing__bg" aria-hidden="true" style={parallax(-0.1)}>
          <div className="g-landing__bg-img" />
          <div className="g-landing__bg-vignette" />
        </div>

        <div className="g-hero__inner" style={parallax(0.04)}>
          <p className="g-hero__eyebrow">{t('welcome.eyebrow')}</p>
          <h1 className="g-hero__title">
            {t('landing.titleLine1')}
            <span className="g-hero__title-accent">{t('landing.titleAccent')}</span>
          </h1>
          <p className="g-hero__standfirst">{t('landing.standfirst')}</p>

          <div className="g-hero__scroll" aria-hidden="true">
            <span>{t('landing.scrollBegin')}</span>
            <ArrowDown weight="bold" />
          </div>
        </div>
      </section>

      <section className="g-unfold" ref={revealRef}>
        <div className={`g-unfold__inner ${revealed ? 'is-in' : ''}`}>
          <p className="g-label">{t('welcome.language.question')}</p>
          <div className="g-bento" role="radiogroup" aria-label={t('welcome.language.question')}>
            {LANGUAGES.map((l) => {
              const selected = l.code === lang;
              return (
                <button
                  key={l.code}
                  role="radio"
                  aria-checked={selected}
                  className={`g-bento__tile ${selected ? 'is-selected' : ''}`}
                  onClick={() => onSelectLanguage(l.code)}
                >
                  <span className="g-bento__native">{l.native}</span>
                  <span className="g-bento__english">{l.english}</span>
                  {selected ? (
                    <span className="g-bento__check" aria-hidden="true">
                      <Check weight="bold" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="g-start">
            <p className="g-start__hint">{t('input.hint')}</p>
            <div className="g-start__actions">
              <button className="g-start__card g-start__card--voice" onClick={() => onStart('voice')}>
                <span className="g-start__icon" aria-hidden="true">
                  <Microphone weight="fill" />
                </span>
                <span className="g-start__label">{t('input.voice')}</span>
                <ArrowRight className="g-start__arrow" weight="bold" aria-hidden="true" />
              </button>
              <button className="g-start__card g-start__card--type" onClick={() => onStart('type')}>
                <span className="g-start__icon" aria-hidden="true">
                  <Keyboard weight="fill" />
                </span>
                <span className="g-start__label">{t('input.type')}</span>
                <ArrowRight className="g-start__arrow" weight="bold" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
