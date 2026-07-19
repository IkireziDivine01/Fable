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

export function HomeIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75V19.5A2.25 2.25 0 0 0 6.75 21.75h10.5A2.25 2.25 0 0 0 19.5 19.5V9.75"
      />
    </HeroIcon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    </HeroIcon>
  );
}

export function Bars3Icon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </HeroIcon>
  );
}

export function XMarkIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </HeroIcon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </HeroIcon>
  );
}

export function ChatBubbleLeftRightIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.043-1.02.049v3.018a.75.75 0 0 1-1.206.606l-3.348-2.568A9.72 9.72 0 0 1 12 16.5c-2.695 0-5.163-.855-7.148-2.292A2.25 2.25 0 0 1 3 12.097V7.811c0-.969.616-1.813 1.5-2.097A11.95 11.95 0 0 1 12 4.5c2.695 0 5.163.855 7.148 2.292.627.456 1.102 1.107 1.102 1.719Z"
      />
    </HeroIcon>
  );
}

export function LightBulbIcon(props: IconProps) {
  return (
    <HeroIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
      />
    </HeroIcon>
  );
}
