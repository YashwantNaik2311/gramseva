import type { MessageKey } from '../lib/i18n';
import { Button } from '../components/Button';
import { ArrowClockwise, House } from '@phosphor-icons/react';

type T = (k: MessageKey, vars?: Record<string, string | number>) => string;

interface ErrorProps {
  t: T;
  message: string;
  onRetry?: () => void;
  onHome: () => void;
}

export function ErrorScreen({ t, message, onRetry, onHome }: ErrorProps) {
  return (
    <section className="g-state g-state--error" role="alert">
      <div className="g-state__icon" aria-hidden="true">
        <ArrowClockwise weight="duotone" />
      </div>
      <h2 className="g-state__title">{t('error.genericTitle')}</h2>
      <p className="g-state__detail">{message || t('error.genericDetail')}</p>
      <div className="g-actions">
        {onRetry ? (
          <Button variant="primary" onClick={onRetry} icon={<ArrowClockwise weight="bold" />}>
            {t('error.retry')}
          </Button>
        ) : null}
        <Button variant="outline" onClick={onHome} icon={<House weight="bold" />}>
          {t('error.goHome')}
        </Button>
      </div>
    </section>
  );
}
