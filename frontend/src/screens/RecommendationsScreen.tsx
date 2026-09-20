import { useState } from 'react';
import type { Candidate, Profile, SupportedLanguage } from '../lib/types';
import type { TranslateFn } from '../lib/i18n';
import { localizeValue } from '../lib/values';
import { EmptyState } from '../components/EmptyState';
import {
  CaretDown,
  Check,
  WarningCircle,
  ShieldCheck,
  ArrowRight,
} from '@phosphor-icons/react';

interface RecoProps {
  t: TranslateFn;
  lang: SupportedLanguage;
  profile: Profile;
  candidates: Candidate[];
  onOpen: (c: Candidate) => void;
  onEditProfile: () => void;
  onStartOver: () => void;
}

export function RecommendationsScreen({ t, lang, candidates, onOpen, onEditProfile }: RecoProps) {
  const [openWhy, setOpenWhy] = useState<string | null>(null);

  if (candidates.length === 0) {
    return (
      <section className="g-screen g-reco" aria-label={t('reco.title')}>
        <EmptyState
          title={t('reco.noResults.title')}
          detail={t('reco.noResults.detail')}
          actionLabel={t('profile.edit')}
          onAction={onEditProfile}
        />
      </section>
    );
  }

  const subtitle = candidates.length === 1 ? t('reco.subtitle.single') : t('reco.subtitle.many', { n: candidates.length });

  return (
    <section className="g-screen g-reco" aria-label={t('reco.title')}>
      <div className="g-reco__head">
        <p className="g-reco__count">{t('reco.countLabel')}</p>
        <h2 className="g-reco__title">{t('reco.title')}</h2>
        <p className="g-reco__subtitle">{subtitle}</p>
      </div>

      <ul className="g-reco__list">
        {candidates.map((c, idx) => {
          const expanded = openWhy === c.schemeId;
          const firstBenefit = c.benefits?.[0]?.[lang] ?? c.benefits?.[0]?.en ?? '';
          return (
            <li key={c.schemeId} className="g-reco-item">
              <div
                className="g-reco-item__main"
                onClick={() => onOpen(c)}
                role="button"
                tabIndex={0}
                aria-label={`${c.localizedName || c.name}: ${t('reco.viewDetails')}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(c);
                  }
                }}
              >
                <span className="g-reco-item__index" aria-hidden="true">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="g-reco-item__body">
                  <h3 className="g-reco-item__name">{c.localizedName || c.name}</h3>
                  {firstBenefit ? <p className="g-reco-item__desc">{firstBenefit}</p> : null}
                  <div className="g-reco-item__matches" aria-label={t('reco.why.matched')}>
                    {c.matchedAttributes.map((m) => (
                      <span className="g-match-chip" key={m.attribute}>
                        <Check weight="bold" aria-hidden="true" />
                        {localizeValue(lang, m.userValue as string | number | boolean | null | undefined)}
                      </span>
                    ))}
                    {c.unknownConditions.map((u) => (
                      <span className="g-verify-chip" key={u.attribute}>
                        <WarningCircle weight="bold" aria-hidden="true" />
                        {t(`profile.attribute.${u.attribute}` as Parameters<TranslateFn>[0])}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="g-reco-item__arrow" aria-hidden="true">
                  <ArrowRight weight="bold" />
                </span>
              </div>

              <button
                className="g-why-toggle"
                aria-expanded={expanded}
                onClick={() => setOpenWhy(expanded ? null : c.schemeId)}
              >
                {t('reco.why')}
                <CaretDown weight="bold" aria-hidden="true" />
              </button>

              {expanded ? <WhyMatch t={t} lang={lang} candidate={c} /> : null}
            </li>
          );
        })}
      </ul>

      <p className="g-reco__footnote">
        <ShieldCheck weight="bold" aria-hidden="true" />
        {t('reco.disclaimer')}
      </p>
    </section>
  );
}

function WhyMatch({ t, lang, candidate }: { t: TranslateFn; lang: SupportedLanguage; candidate: Candidate }) {
  return (
    <div className="g-why">
      <div className="g-why__grid">
        <div className="g-why__block">
          <span className="g-why__label">{t('reco.why.matched')}</span>
          {candidate.matchedAttributes.length > 0 ? (
            candidate.matchedAttributes.map((m) => (
              <div className="g-why__row" data-kind="matched" key={m.attribute}>
                <Check weight="bold" aria-hidden="true" />
                <span>
                  {t(`profile.attribute.${m.attribute}` as Parameters<TranslateFn>[0])}: {localizeValue(lang, m.userValue as string | number | boolean | null | undefined)}
                </span>
              </div>
            ))
          ) : (
            <div className="g-why__row" data-kind="matched">
              <Check weight="bold" aria-hidden="true" />
              <span>{t('reco.why.matched')}</span>
            </div>
          )}
        </div>

        {candidate.unknownConditions.length > 0 ? (
          <div className="g-why__block">
            <span className="g-why__label">{t('reco.why.verify')}</span>
            {candidate.unknownConditions.map((u) => (
              <div className="g-why__row" data-kind="verify" key={u.attribute}>
                <WarningCircle weight="bold" aria-hidden="true" />
                <span>
                  {t(`profile.attribute.${u.attribute}` as Parameters<TranslateFn>[0])} — {t('scheme.notKnown')}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <p className="g-why__row" data-kind="verify">
        <ShieldCheck weight="bold" aria-hidden="true" />
        <span>{t('reco.disclaimer')}</span>
      </p>
    </div>
  );
}
