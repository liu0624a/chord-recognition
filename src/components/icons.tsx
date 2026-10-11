// Inline SVG icons drawn with `currentColor` so they follow the active theme.
// No external icon dependency. Icons are aria-hidden; callers provide the label.

import { ReactNode, SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function Svg({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconGear(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </Svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </Svg>
  );
}

export function IconPiano(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="7" width="19" height="12" rx="1.5" />
      <path d="M6 7v7M9.5 7v7M13 7v7M16.5 7v7M20 7v7" />
      <path d="M7.8 7v4M11.3 7v4M14.8 7v4M18.3 7v4" strokeWidth={2.6} />
    </Svg>
  );
}

export function IconGuitar(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.5 21a3.5 3.5 0 0 0 7 0c0-1.3-.5-2.3-1.2-3.8L12.9 14h-1.8L9.7 17.2C9 18.7 8.5 19.7 8.5 21Z" />
      <path d="M12 14V6" />
      <path d="M9.5 6a2.5 2.5 0 0 1 2.5-2.5c1 0 1.8.6 2.1 1.4" />
      <path d="M14.5 3.5h1M11 3.5h-1" />
    </Svg>
  );
}

export function IconUkulele(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 20a3 3 0 0 0 5 0c0-1.2-.4-2.1-1-3.4l-1.2-3h-1.6L10 16.6c-.6 1.3-1 2.2-1 3.4Z" />
      <path d="M12.5 13.5V7" />
      <path d="M11.3 7a1.8 1.8 0 0 1 1.2-1.7c.7-.3 1.4 0 1.7.6" />
      <path d="M12.8 4.5h.8M10.8 4.5h-.6" />
    </Svg>
  );
}

export function IconMidi(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </Svg>
  );
}

export function IconPedal(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="10" rx="1.5" />
      <path d="M6 4V3M18 4V3" />
      <path d="M8 14l-1 5h10l-1-5" />
      <path d="M12 7v3" />
    </Svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 5l11 7-11 7Z" />
    </Svg>
  );
}

export function IconStop(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </Svg>
  );
}
