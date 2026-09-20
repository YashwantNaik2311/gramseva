import { useEffect, useState } from 'react';
import type { TranslateFn } from '../lib/i18n';

const EXTRACT_STAGES = ['processing.stage.understand'] as const;
const RECOMMEND_STAGES = [
  'processing.stage.check',
  'processing.stage.find',
  'processing.stage.compare',
] as const;

type Phase = 'extract' | 'recommend';

export function ProcessingInline({ t, phase }: { t: TranslateFn; phase: Phase }) {
  const stages = phase === 'extract' ? EXTRACT_STAGES : RECOMMEND_STAGES;
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (stages.length <= 1) return;
    const id = window.setInterval(() => {
      setActive((a) => (a >= stages.length - 1 ? a : a + 1));
    }, 1500);
    return () => window.clearInterval(id);
  }, [stages.length]);

  return (
    <div className="g-processing" role="status" aria-live="polite">
      <div className="g-processing__mark" aria-hidden="true" />
      <h3 className="g-processing__title">
        {phase === 'extract' ? t('processing.stage.understand') : t('processing.title')}
      </h3>
      {stages.length > 1 ? (
        <div className="g-processing__stages" aria-hidden="true">
          {stages.map((s, i) => (
            <span key={s} className="g-processing__stage-wrap" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <span
                className="g-processing__stage"
                style={{
                  color: i < active ? 'var(--pine-700)' : i === active ? 'var(--text-primary)' : 'var(--text-faint)',
                  opacity: i < active ? 0.85 : i === active ? 1 : 0.6,
                }}
              >
                {t(s)}
              </span>
              {i < stages.length - 1 ? <span className="g-processing__sep" aria-hidden="true" /> : null}
            </span>
          ))}
        </div>
      ) : null}
      <p className="g-processing__note">{phase === 'extract' ? t('processing.note.extract') : t('processing.note.recommend')}</p>
    </div>
  );
}
