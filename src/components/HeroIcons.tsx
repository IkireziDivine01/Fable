'use client';

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function HeroIcon({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
    </HeroIcon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 15.75 3 12m0 0 3.75-3.75M3 12h18" />
    </HeroIcon>
  );
}

export function BookOpenIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25A8.967 8.967 0 0 1 18 3.75c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
      />
    </HeroIcon>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </HeroIcon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </HeroIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </HeroIcon>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
      />
    </HeroIcon>
  );
}

export function CloudArrowDownIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16.5V9.75m0 6.75-3-3m3 3 3-3M6.75 18a4.5 4.5 0 0 1-.99-8.89 6 6 0 0 1 11.68-2.2A4.5 4.5 0 0 1 18 18H6.75Z"
      />
    </HeroIcon>
  );
}

export function DevicePhoneMobileIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 1.5h3m-6.75 0h10.5A2.25 2.25 0 0 1 19.5 3.75v16.5a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25V3.75A2.25 2.25 0 0 1 6.75 1.5Zm5.25 18.75h.008v.008H12v-.008Z"
      />
    </HeroIcon>
  );
}

export function GlobeAltIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9 9 0 1 0 0-18m0 18a9 9 0 1 1 0-18m0 18c2.071 0 3.75-4.03 3.75-9S14.071 3 12 3m0 18c-2.071 0-3.75-4.03-3.75-9S9.929 3 12 3m-8.485 6h16.97M3.515 15h16.97"
      />
    </HeroIcon>
  );
}

export function HandRaisedIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 6.75v6m0-6a1.5 1.5 0 1 0-3 0v5.25m3-5.25a1.5 1.5 0 0 1 3 0v5.25m0-5.25a1.5 1.5 0 0 1 3 0v5.25M7.5 12V9a1.5 1.5 0 0 0-3 0v5.25A6.75 6.75 0 0 0 11.25 21h1.5a6.75 6.75 0 0 0 6.75-6.75V9.75a1.5 1.5 0 0 0-3 0V12"
      />
    </HeroIcon>
  );
}

export function LanguageIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m10.5 21 5.25-11.25L21 21m-8.25-3h6M3 5.25h7.5M6.75 3v2.25m0 0c0 2.9-1.68 5.4-4.125 6.59M6.75 5.25c0 2.9 1.68 5.4 4.125 6.59M3.75 15.75c1.2-.66 2.2-1.55 3-2.6.8 1.05 1.8 1.94 3 2.6"
      />
    </HeroIcon>
  );
}

export function PlayCircleIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 8.75 15 12l-4.5 3.25v-6.5Z" />
    </HeroIcon>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.6 6 12.02 12.02 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.6-3.75A11.959 11.959 0 0 1 12 2.714Z"
      />
    </HeroIcon>
  );
}
