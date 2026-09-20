import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  desc?: string;
  children: ReactNode;
  'aria-labelledby'?: string;
}

export function Sheet({ open, onClose, title, desc, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="g-scrim" onClick={onClose} aria-hidden="true" />
      <div className="g-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="g-sheet__handle" aria-hidden="true" />
        <h3 className="g-sheet__title">{title}</h3>
        {desc ? <p className="g-sheet__desc">{desc}</p> : null}
        {children}
      </div>
    </>
  );
}
