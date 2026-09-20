import { Button } from './Button';
import { MagnifyingGlass } from '@phosphor-icons/react';

interface EmptyStateProps {
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, detail, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="g-state">
      <div className="g-state__icon" aria-hidden="true">
        <MagnifyingGlass weight="duotone" />
      </div>
      <h3 className="g-state__title">{title}</h3>
      <p className="g-state__detail">{detail}</p>
      {actionLabel && onAction ? (
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
