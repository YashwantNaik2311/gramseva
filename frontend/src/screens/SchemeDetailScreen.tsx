import { useEffect, useState } from 'react';
import type { Candidate, Profile, Scheme, SupportedLanguage } from '../lib/types';
import type { TranslateFn } from '../lib/i18n';
import { api } from '../lib/api';
import { localizeValue } from '../lib/values';
import { Button } from '../components/Button';
import {
  ArrowUpRight,
  Check,
  WarningCircle,
  ShieldCheck,
  FileText,
  LinkSimple,
  SpeakerHigh,
  Stop,
  SealCheck,
} from '@phosphor-icons/react';

interface DetailProps {
  t: TranslateFn;
  lang: SupportedLanguage;
  profile: Profile;
  candidate: Candidate;
  scheme: Scheme | null;
  onSchemeLoaded: (scheme: Scheme) => void;
  onLoadError: (message: string) => void;
  onBack: () => void;
}

const SUPPORTED_TTS: SupportedLanguage[] = ['en', 'hi'];

export function SchemeDetailScreen({ t, lang, profile, candidate, scheme, onSchemeLoaded, onLoadError }: DetailProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [synthError, setSynthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!scheme) {
      api
        .getScheme(candidate.schemeId)
        .then(({ scheme }) => {
          if (!cancelled) onSchemeLoaded(scheme);
        })
        .catch((err) => {
          if (!cancelled) onLoadError(err instanceof Error ? err.message : t('error.schemeDetail'));
        });
    }
    return () => {
      cancelled = true;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate.schemeId]);

  if (!scheme) {
    return <DetailSkeleton />;
  }

  const getName = () => scheme.localizedName?.[lang] ?? scheme.localizedName?.en ?? scheme.name ?? candidate.name;
  const getDesc = () => scheme.description?.[lang] ?? scheme.description?.en ?? '';
  const getDocs = () => scheme.documents ?? [];
  const getBenefits = () => scheme.benefits ?? [];
  const ttsAvailable = SUPPORTED_TTS.includes(lang);

  const speak = async () => {
    setSynthError(null);
    if (playing) {
      stop();
      return;
    }
      try {
        const summary = buildSpeechText(lang, scheme);
        const res = await api.synthesize(lang, summary);
      const bin = base64ToBlob(res.audioBase64, res.contentType);
      const url = URL.createObjectURL(bin);
      setAudioUrl(url);
      const audio = new Audio(url);
      audio.onended = () => setPlaying(false);
      audio.onerror = () => {
        setPlaying(false);
        setSynthError(t('error.voiceDetail'));
      };
      await audio.play();
      setPlaying(true);
    } catch {
      setSynthError(t('error.voiceDetail'));
    }
  };

  const stop = () => {
    setPlaying(false);
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const matchedSet = new Set<string>(candidate.matchedAttributes.map((m) => m.attribute));
  return (
    <section className="g-screen g-detail" aria-label={getName()}>
      <div>
        <h2 className="g-detail__title">{getName()}</h2>
        <div className="g-detail__meta">
          <SealCheck aria-hidden="true" />
          <span>
            {t('scheme.source')} · {scheme.sourceName || candidate.sourceName}
          </span>
        </div>
      </div>

      {ttsAvailable || synthError ? (
        <div className="g-detail__listen">
          <Button
            variant={playing ? 'ghost' : 'marigold'}
            small
            onClick={playing ? stop : speak}
            icon={playing ? <Stop weight="bold" /> : <SpeakerHigh weight="bold" />}
          >
            {playing ? t('scheme.listening') : t('scheme.listen')}
          </Button>
          {synthError ? (
            <span className="g-form-error" role="alert">
              {synthError}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="g-detail__section">
        <h3 className="g-detail__section-title">{t('scheme.about')}</h3>
        <p className="g-detail__para">{getDesc()}</p>
      </div>

      {getBenefits().length > 0 ? (
        <div className="g-detail__section">
          <h3 className="g-detail__section-title">{t('reco.mayHelp')}</h3>
          {getBenefits().map((b, i) => (
            <div className="g-benefit" key={i}>
              <Check weight="bold" aria-hidden="true" />
              <span>{b[lang] ?? b.en ?? ''}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="g-detail__section">
        <h3 className="g-detail__section-title">{t('scheme.why')}</h3>
        {scheme.eligibility.map((cond, i) => {
          const matched = matchedSet.has(cond.attribute);
          const userAttr = profile.attributes[cond.attribute as keyof Profile['attributes']];
          const unknown = !userAttr || userAttr.status !== 'provided';
          return (
            <EligibilityRow
              key={i}
              t={t}
              matched={matched}
              unknown={unknown}
              condText={describeCondition(t, lang, cond)}
            />
          );
        })}
      </div>

      {getDocs().length > 0 ? (
        <div className="g-detail__section">
          <h3 className="g-detail__section-title">{t('scheme.documents')}</h3>
          <div className="g-steps">
            <div className="g-step">
              <span className="g-step__num">1</span>
              <div className="g-step__body">
                <p className="g-step__title">{t('scheme.documents.step.elegibility')}</p>
              </div>
            </div>
            <div className="g-step">
              <span className="g-step__num">2</span>
              <div className="g-step__body">
                <p className="g-step__title">{t('scheme.documents.step.documents')}</p>
                <div className="g-docchips">
                  {getDocs().map((d, i) => (
                    <span className="g-docchip" key={i}>
                      <FileText aria-hidden="true" />
                      {d[lang] ?? d.en ?? ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="g-step">
              <span className="g-step__num">3</span>
              <div className="g-step__body">
                <p className="g-step__title">{t('scheme.documents.step.apply')}</p>
                <Button
                  variant="primary"
                  small
                  onClick={() => window.open(scheme.applicationUrl, '_blank', 'noopener')}
                  icon={<ArrowUpRight weight="bold" />}
                >
                  {t('scheme.apply')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="g-detail__section">
        <h3 className="g-detail__section-title">{t('scheme.source')}</h3>
        <div className="g-source">
          <div className="g-source__line">
            <SealCheck aria-hidden="true" />
            <span>
              <span className="g-source__label">{scheme.sourceName || candidate.sourceName}</span>
              <span className="g-source__value">{t('scheme.sourceDetail', { date: formatDate(scheme.lastVerified || candidate.lastVerified, lang) })}</span>
            </span>
          </div>
          {scheme.officialSource ? (
            <Button
              variant="outline"
              small
              onClick={() => window.open(scheme.officialSource, '_blank', 'noopener')}
              icon={<LinkSimple weight="bold" />}
            >
              {t('scheme.source')}
            </Button>
          ) : null}
        </div>
      </div>

      <p className="g-disclaimer">{t('scheme.disclaimer')}</p>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <section className="g-screen g-detail" aria-busy="true">
      <div className="g-skeleton g-skeleton--title" />
      <div className="g-skeleton g-skeleton--row" />
      <div className="g-skeleton g-skeleton--block" />
      <div className="g-skeleton g-skeleton--block" />
    </section>
  );
}

function EligibilityRow({
  t,
  matched,
  unknown,
  condText,
}: {
  t: TranslateFn;
  matched: boolean;
  unknown: boolean;
  condText: string;
}) {
  const kind = matched ? 'matched' : unknown ? 'unknown' : 'notmet';
  const tag = matched ? t('scheme.matched') : unknown ? t('scheme.unknown') : t('scheme.optional');
  const Icon = matched ? Check : unknown ? WarningCircle : ShieldCheck;
  return (
    <div className="g-elig" data-kind={kind}>
      <span className="g-elig__icon" aria-hidden="true">
        <Icon weight="bold" />
      </span>
      <div>
        <span className="g-elig__tag">{tag}</span>
        <p className="g-elig__text">{condText}</p>
      </div>
    </div>
  );
}

function describeCondition(t: TranslateFn, lang: SupportedLanguage, cond: { attribute: string; operator: string; value: any }): string {
  const label = t(`profile.attribute.${cond.attribute}` as Parameters<TranslateFn>[0]);
  switch (cond.operator) {
    case 'eq':
      return `${label}: ${localizeValue(lang, cond.value)}`;
    case 'in':
      return `${label}: ${Array.isArray(cond.value) ? cond.value.map((v) => localizeValue(lang, v)).join(', ') : cond.value}`;
    case 'between':
      return `${label}: ${cond.value[0]}–${cond.value[1]}`;
    case 'gte':
      return `${label}: ${cond.value}+`;
    case 'lte':
      return `${label}: ${cond.value}−`;
    default:
      return label;
  }
}

function buildSpeechText(lang: SupportedLanguage, scheme: Scheme): string {
  const name = scheme.localizedName?.[lang] ?? scheme.localizedName?.en ?? scheme.name;
  const desc = scheme.description?.[lang] ?? scheme.description?.en ?? '';
  const benefit = scheme.benefits?.[0]?.[lang] ?? scheme.benefits?.[0]?.en ?? '';
  const parts = [name];
  if (desc) parts.push(desc);
  if (benefit) parts.push(benefit);
  const text = parts.join('. ');
  return text.slice(0, 590);
}

function formatDate(iso: string, lang: SupportedLanguage): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(lang === 'kn' ? 'kn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: contentType });
}
