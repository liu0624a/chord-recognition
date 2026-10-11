// A compact icon-only button with an accessible label, a hover/focus tooltip,
// and a clear pressed state for toggles. Reused across the toolbar.

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name (also shown as the tooltip when `tooltip` is omitted). */
  label: string;
  /** Optional tooltip text overriding the label. */
  tooltip?: string;
  /** Toggle state; sets aria-pressed and the active style. */
  active?: boolean;
  children: ReactNode;
}

export function IconButton({ label, tooltip, active, children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`icon-btn${active ? ' icon-btn--active' : ''}`}
      aria-label={label}
      aria-pressed={active}
      data-tooltip={tooltip ?? label}
      {...rest}
    >
      {children}
    </button>
  );
}
