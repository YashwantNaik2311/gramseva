import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'marigold' | 'ghost' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  small?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', block, small, icon, className, children, ...rest }: ButtonProps) {
  const cls = [
    'g-btn',
    `g-btn--${variant}`,
    block ? 'g-btn--block' : '',
    small ? 'g-btn--small' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={cls} {...rest}>
      {icon ? <span className="g-btn__icon" aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
}

export function IconButton({ icon, label, className, ...rest }: IconButtonProps) {
  return (
    <button className={`g-icon-btn ${className ?? ''}`.trim()} aria-label={label} {...rest}>
      {icon}
    </button>
  );
}
